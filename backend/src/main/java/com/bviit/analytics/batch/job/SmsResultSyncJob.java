package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.BatchSlackNotifier;
import com.bviit.analytics.batch.dto.BatchRunLog;
import com.bviit.analytics.batch.repository.BatchRunLogRepository;
import com.bviit.analytics.sms.config.SolapiProperties;
import com.bviit.analytics.sms.service.SolapiSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 발송 결과 동기화 배치 — 웹훅 유실 대비. 최근 2일 발송 로그 중 PENDING 인 것을
 * 솔라피 getMessageList 로 재조회해 send_log·큐 상태를 굳힌다.
 *
 * <p>{@link SolapiSyncService#sync(LocalDate, LocalDate)} 를 래핑해 다른 배치 잡과 같은
 * 관측 스택({@link BatchRunLogRepository} 이력 · {@link BatchSlackNotifier} 알림) 을 통과시킨다.
 * 승격 이전에는 {@code SolapiSyncService.runScheduledFallback} 이 {@code @Scheduled} 로
 * 직접 돌아 이력이 안 남았다 — 정상 흐름에서 갱신 0건이 대부분이라 큰 문제는 없었지만
 * 실패나 대량 갱신이 발생했을 때 다른 배치와 함께 조회·재실행하기 어려웠다.
 *
 * <h3>안전장치</h3>
 * <ul>
 *   <li>솔라피 미설정({@code SOLAPI_API_KEY} 비어 있음) 이면 스케줄러가 붙어 있어도 조용히 skip</li>
 *   <li>{@code SOLAPI_SYNC_CRON="-"} 로 스케줄 아예 미등록</li>
 *   <li>실 흐름은 웹훅(SmsWebhookController)이 실시간 반영 — 이 잡은 유실 대비 안전망이라
 *       정상이면 갱신 0건이 정상이다</li>
 * </ul>
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class SmsResultSyncJob {

    private static final String JOB_NAME_PREFIX = "sms-result-sync";
    /** 재조회 창 크기 — 웹훅이 며칠 유실돼도 회수할 수 있게 여유 잡음. */
    private static final int SYNC_RANGE_DAYS = 2;

    private final SolapiSyncService syncService;
    private final SolapiProperties solapiProperties;
    private final BatchRunLogRepository runLogRepository;
    private final BatchSlackNotifier slackNotifier;

    /**
     * 매일 03:30 KST(기본) 실행. cron="-" 이면 스케줄러 미등록.
     * 솔라피 미설정이면 조용히 skip — 로컬·솔라피 계정 없는 환경 안전 부팅.
     */
    @Scheduled(cron = "${solapi.sync-cron:0 30 3 * * *}", zone = "Asia/Seoul")
    public void runScheduled() {
        if (!solapiProperties.isConfigured()) {
            log.debug("SmsResultSyncJob skip — 솔라피 미설정");
            return;
        }
        run();
    }

    /**
     * 실제 동기화. Admin API 로도 부를 수 있게 public.
     * batch_run_log 이력 + Slack 요약. 예외는 잡아서 로그·Slack 만 남기고 다음 사이클로.
     */
    public Map<String, Integer> run() {
        String jobName = JOB_NAME_PREFIX + "[" + LocalDateTime.now().withNano(0) + "]";
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(SYNC_RANGE_DAYS);
        long runId = runLogRepository.start(jobName, BatchRunLog.RunType.MANUAL, from, to);
        Instant startedAt = Instant.now();
        Map<String, Integer> stats = new LinkedHashMap<>();
        try {
            int updated = syncService.sync(from, to);
            stats.put("updated", updated);
            stats.put("range_days", SYNC_RANGE_DAYS);
            runLogRepository.success(runId, stats);
            slackNotifier.notifySuccess(jobName, BatchRunLog.RunType.MANUAL, from, to, stats,
                    Duration.between(startedAt, Instant.now()));
            log.info("SmsResultSyncJob done: {}", stats);
        } catch (Exception e) {
            log.error("SmsResultSyncJob failed", e);
            runLogRepository.fail(runId, e.toString());
            slackNotifier.notifyFailure(jobName, BatchRunLog.RunType.MANUAL, from, to, e.toString(),
                    Duration.between(startedAt, Instant.now()));
        }
        return stats;
    }
}
