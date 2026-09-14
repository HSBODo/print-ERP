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
     * 매 15분 KST(기본) 실행. cron="-" 이면 스케줄러 미등록.
     * 솔라피 미설정이면 조용히 skip — 로컬·솔라피 계정 없는 환경 안전 부팅.
     *
     * <p>스케줄러는 <b>updated=0 인 사이클은 batch_run_log·Slack 을 남기지 않는다</b> —
     * 하루 96회 실행되므로 갱신 없는 사이클까지 남기면 배치 관리 페이지·Slack 채널이
     * sms-result-sync 로 뒤덮인다. 웹훅이 정상이면 대부분 사이클이 0건이라 자연스럽게 조용.
     */
    @Scheduled(cron = "${solapi.sync-cron:0 */15 * * * *}", zone = "Asia/Seoul")
    public void runScheduled() {
        if (!solapiProperties.isConfigured()) {
            log.debug("SmsResultSyncJob skip — 솔라피 미설정");
            return;
        }
        // 스케줄러 자동 사이클 — POLLER 로 기록 (사람 수동 트리거와 구분). forceLog=false 라 빈 사이클 스킵.
        runInternal(BatchRunLog.RunType.POLLER, false);
    }

    /**
     * 실제 동기화. Admin API 로도 부를 수 있게 public.
     * batch_run_log 이력 + Slack 요약. 예외는 잡아서 로그·Slack 만 남기고 다음 사이클로.
     *
     * <p>사람이 명시적으로 트리거하는 경로 — MANUAL 로 기록. 결과 무관하게 항상 로그.
     */
    public Map<String, Integer> run() {
        return runInternal(BatchRunLog.RunType.MANUAL, true);
    }

    /**
     * 공통 실행 경로.
     *
     * @param runType  batch_run_log.run_type 에 기록 — 사람 트리거는 MANUAL, 스케줄러는 POLLER.
     * @param forceLog true 면 결과가 비어도 batch_run_log·Slack 남김 (매뉴얼 실행 용).
     *                 false 면 실제 갱신(updated>0) 이 있었을 때만 batch_run_log·Slack 남김
     *                 (스케줄러 15분 사이클 노이즈 방지). 애플리케이션 INFO 로그는 매 사이클 남는다.
     */
    private Map<String, Integer> runInternal(BatchRunLog.RunType runType, boolean forceLog) {
        String jobName = JOB_NAME_PREFIX + "[" + LocalDateTime.now().withNano(0) + "]";
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(SYNC_RANGE_DAYS);
        Instant startedAt = Instant.now();
        Map<String, Integer> stats = new LinkedHashMap<>();

        int updated;
        try {
            updated = syncService.sync(from, to);
        } catch (Exception e) {
            // 예외는 무조건 로그·Slack — 조용히 넘기면 문제 감지 못 함.
            log.error("SmsResultSyncJob failed", e);
            long runId = runLogRepository.start(jobName, runType, from, to);
            runLogRepository.fail(runId, e.toString());
            slackNotifier.notifyFailure(jobName, runType, from, to, e.toString(),
                    Duration.between(startedAt, Instant.now()));
            return stats;
        }

        stats.put("updated", updated);
        stats.put("range_days", SYNC_RANGE_DAYS);
        log.info("SmsResultSyncJob done: {}", stats);

        if (forceLog || updated > 0) {
            long runId = runLogRepository.start(jobName, runType, from, to);
            runLogRepository.success(runId, stats);
            slackNotifier.notifySuccess(jobName, runType, from, to, stats,
                    Duration.between(startedAt, Instant.now()));
        }
        return stats;
    }
}
