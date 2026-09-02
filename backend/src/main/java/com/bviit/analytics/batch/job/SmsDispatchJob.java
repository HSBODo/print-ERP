package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.BatchSlackNotifier;
import com.bviit.analytics.batch.dto.BatchRunLog;
import com.bviit.analytics.batch.repository.BatchRunLogRepository;
import com.bviit.analytics.sms.config.SmsDispatchProperties;
import com.bviit.analytics.sms.dto.SmsSendRequest;
import com.bviit.analytics.sms.dto.SmsSendResult;
import com.bviit.analytics.sms.entity.SmsDispatchQueue;
import com.bviit.analytics.sms.service.SmsDispatchQueueService;
import com.bviit.analytics.sms.service.SmsSendService;
import com.bviit.analytics.sms.service.SolapiSendService;
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
import java.util.List;
import java.util.Map;

/**
 * 자동 발송 배치 — 매 5분(기본) 폴링해서 예정 시각 도래한 큐를 발송.
 *
 * <p>Phase 2 의 심장. Phase 1 은 관리자가 [발송] 버튼을 눌러야 나갔는데, 이 잡이
 * {@code sms.dispatch.enabled=true} 이면 대신 눌러 준다. 실제 발송·안전장치는 그대로
 * {@link SmsSendService} 가 담당(홀딩·수신거부·문구미설정·이미발송 등 skip).
 *
 * <h3>흐름</h3>
 * <ol>
 *   <li>{@link SmsDispatchQueueService#pollPending} — SKIP LOCKED 로 도래 큐 잡기 → PROCESSING</li>
 *   <li>광고톡(kind=AD) 인데 현재 시각이 window 밖이면 상태 원복 후 다음 사이클로 미룸</li>
 *   <li>{@link SmsSendService#send} 한 건씩 호출 → SUCCESS/FAILED/SKIPPED 분류</li>
 *   <li>큐 상태 갱신 (DONE / FAILED-retry / CANCELED)</li>
 *   <li>배치 종료 시 {@code batch_run_log} 기록 + Slack 요약</li>
 * </ol>
 *
 * <h3>안전장치</h3>
 * <ul>
 *   <li>기본 disabled — {@code SMS_DISPATCH_ENABLED=true} 로 명시적 활성화</li>
 *   <li>Solapi dry-run — SolapiSendService 안에서 걸리므로 자동으로 상속 (messageType=DRY_RUN)</li>
 *   <li>일일 한도 — DONE 카운트가 {@code sms.dispatch.daily-limit} 초과 시 사이클 skip</li>
 *   <li>광고톡 시간대 — 하드 21~08 금지, 서비스 config 로 조정 가능</li>
 *   <li>최대 재시도 — {@code sms.dispatch.max-attempts} 도달 시 FAILED 로 굳음</li>
 * </ul>
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class SmsDispatchJob {

    private static final String JOB_NAME_PREFIX = "sms-dispatch";

    private final SmsDispatchQueueService queueService;
    private final SmsSendService sendService;
    private final SmsDispatchProperties props;
    private final BatchRunLogRepository runLogRepository;
    private final BatchSlackNotifier slackNotifier;

    /**
     * FAILED 큐 임계치 상승 엣지 판정용 — 이미 임계치 초과 상태이면 true. 매 사이클마다 시끄럽지 않게
     * 진입 시 한 번만 알리고, 관리자가 [실패 재실행] 으로 밑으로 내리면 리셋된다. 서버 재시작 시
     * false 로 초기화되어 재알림 — 놓치는 것보단 한 번 더 우는 게 안전.
     */
    private volatile boolean failedOverThreshold = false;

    /**
     * 매 5분(기본) 실행. cron="-" 이면 스케줄러 미등록.
     * enabled=false 면 조용히 skip — 스케줄러는 붙어 있지만 아무 일도 안 함.
     */
    @Scheduled(cron = "${sms.dispatch.cron:0 */5 * * * *}", zone = "Asia/Seoul")
    public void runScheduled() {
        if (!props.isEnabled()) {
            log.debug("SmsDispatchJob disabled — skip");
            return;
        }
        run();
    }

    /**
     * 실제 폴링·발송. Admin API 로도 부를 수 있게 public.
     * batch_run_log 로 이력 남기고 Slack 요약. 예외는 잡아서 로그·Slack.
     */
    public Map<String, Integer> run() {
        String jobName = JOB_NAME_PREFIX + "[" + LocalDateTime.now().withNano(0) + "]";
        LocalDate today = LocalDate.now();
        long runId = runLogRepository.start(jobName, BatchRunLog.RunType.MANUAL, today, today);
        Instant startedAt = Instant.now();
        Map<String, Integer> stats = new LinkedHashMap<>();
        try {
            stats = dispatch();
            runLogRepository.success(runId, stats);
            slackNotifier.notifySuccess(jobName, BatchRunLog.RunType.MANUAL, today, today, stats,
                    Duration.between(startedAt, Instant.now()));
        } catch (Exception e) {
            log.error("SmsDispatchJob failed", e);
            runLogRepository.fail(runId, e.toString());
            slackNotifier.notifyFailure(jobName, BatchRunLog.RunType.MANUAL, today, today, e.toString(),
                    Duration.between(startedAt, Instant.now()));
        }
        checkFailedThreshold();
        return stats;
    }

    /**
     * FAILED 큐 누적 카운트가 임계치 이상이면 Slack 경고 — 상승 엣지에서만 한 번.
     * 카운트가 밑으로 내려가면 상태 리셋(다시 오를 때 재알림). 임계치 0 이하면 비활성.
     * 배치 성공/실패와 무관하게 매 사이클 종료 시 체크 — dispatch() 자체가 통과해도 큐에는 실패가 쌓일 수 있다.
     */
    private void checkFailedThreshold() {
        int threshold = props.getFailedAlertThreshold();
        if (threshold <= 0) return;
        try {
            long failedCount = queueService.countByStatus(SmsDispatchQueue.STATUS_FAILED);
            if (failedCount >= threshold && !failedOverThreshold) {
                slackNotifier.notifyWarning(
                        "SMS 자동발송 FAILED 큐 임계치 초과",
                        String.format("• 현재: `%d건`  •  임계치: `%d건`%n관리자 확인 필요 — /sms-management 상단 카드 → [실패 재실행]",
                                failedCount, threshold));
                failedOverThreshold = true;
                log.warn("SMS FAILED 큐 임계치 초과 알림: failed={}, threshold={}", failedCount, threshold);
            } else if (failedCount < threshold && failedOverThreshold) {
                failedOverThreshold = false;
                log.info("SMS FAILED 큐 임계치 하회 — 알림 리셋: failed={}, threshold={}", failedCount, threshold);
            }
        } catch (Exception e) {
            // 임계치 체크 실패는 배치 흐름을 막지 않는다.
            log.warn("SMS FAILED 큐 임계치 체크 실패: {}", e.toString());
        }
    }

    private Map<String, Integer> dispatch() {
        Map<String, Integer> stats = new LinkedHashMap<>();
        int picked = 0, sent = 0, failed = 0, skipped = 0, canceled = 0, outOfWindow = 0, overLimit = 0;

        long doneToday = queueService.countDoneToday();
        if (doneToday >= props.getDailyLimit()) {
            log.info("SmsDispatchJob skip — daily limit reached: done={}, limit={}", doneToday, props.getDailyLimit());
            stats.put("done_today", (int) doneToday);
            stats.put("over_limit", 1);
            return stats;
        }

        int remainingBudget = (int) Math.max(0, props.getDailyLimit() - doneToday);
        int batchSize = Math.min(props.getBatchSize(), remainingBudget);
        if (batchSize <= 0) {
            stats.put("done_today", (int) doneToday);
            return stats;
        }

        LocalDateTime now = LocalDateTime.now();
        List<SmsDispatchQueue> batch = queueService.pollPending(batchSize, now);
        picked = batch.size();

        for (SmsDispatchQueue row : batch) {
            // 광고톡 시간대 가드 — window 밖이면 다음 사이클로 미룬다(상태만 PENDING 으로 되돌림).
            if (SmsDispatchQueue.KIND_AD.equals(row.getKind()) && !inAdWindow(now)) {
                queueService.markFailed(row.getId(),
                        "광고톡 발송 시간대 밖 (" + now.getHour() + "시, 허용 " + props.getAdWindowStartHour()
                                + ".." + props.getAdWindowEndHour() + "시)",
                        Integer.MAX_VALUE); // window 밖은 재시도 카운트 소진 안 시킴 — max 크게
                outOfWindow++;
                continue;
            }
            DispatchOutcome outcome = dispatchOne(row);
            switch (outcome) {
                case SUCCESS -> sent++;
                case FAILED -> failed++;
                case CANCELED -> canceled++;
                case SKIPPED -> skipped++;
            }
        }

        stats.put("picked", picked);
        stats.put("sent", sent);
        stats.put("failed", failed);
        stats.put("canceled", canceled);
        stats.put("skipped", skipped);
        stats.put("out_of_window", outOfWindow);
        stats.put("done_today", (int) doneToday + sent);
        if (overLimit > 0) stats.put("over_limit", overLimit);
        log.info("SmsDispatchJob done: {}", stats);
        return stats;
    }

    private DispatchOutcome dispatchOne(SmsDispatchQueue row) {
        try {
            SmsSendRequest request = new SmsSendRequest(
                    List.of(row.getTargetId()), row.getTemplateCode(), SolapiSendService.CHANNEL_ALIMTALK);
            SmsSendResult result = sendService.send(request, "sms-dispatch-job");
            if (result.getItems().isEmpty()) {
                // 이런 일은 없어야 하지만 방어적으로 — 결과 없으면 FAILED 로 취급하고 재시도.
                queueService.markFailed(row.getId(), "발송 결과 없음", props.getMaxAttempts());
                return DispatchOutcome.FAILED;
            }
            SmsSendResult.Item item = result.getItems().get(0);
            String r = item.getResult();
            String detail = item.getDetail() == null ? "" : item.getDetail();
            if ("SUCCESS".equals(r)) {
                // dry-run 자동발송(dev·local) 은 실 API 호출이 없어 웹훅이 오지 않는다 —
                // RECEIVED 에 두면 큐가 영원히 완결되지 않으니 여기서 곧바로 DONE 으로 굳힌다.
                // override-to 로 실 API 호출된 케이스는 dryRun=false 라 정상적으로 RECEIVED 로 간다.
                if (item.isDryRun()) {
                    queueService.markDelivered(row.getId());
                } else {
                    queueService.markReceived(row.getId());
                }
                return DispatchOutcome.SUCCESS;
            }
            if ("FAILED".equals(r)) {
                queueService.markFailed(row.getId(), detail, props.getMaxAttempts());
                return DispatchOutcome.FAILED;
            }
            // SKIPPED — 재시도 무의미한 사유는 CANCELED, 홀딩·예정일 전은 PENDING 유지(카운트만 증가).
            if (isTerminalSkip(detail)) {
                queueService.markCanceled(row.getId(), detail);
                return DispatchOutcome.CANCELED;
            }
            // 이미 발송된 차수는 곧바로 DONE — 이 큐 행은 중복 재등록분이라 웹훅 대기(RECEIVED)에
            // 태우면 다른 큐의 도달 결과가 잘못 씹힐 수 있다. markDelivered 로 바로 굳힌다.
            if (detail.contains("이미 발송")) {
                queueService.markDelivered(row.getId());
                return DispatchOutcome.SUCCESS;
            }
            // 홀딩·예정일 전 등 — window 밖과 같은 취급: 카운트 소진 안 함, 다음 사이클 재검토.
            queueService.markFailed(row.getId(), detail, Integer.MAX_VALUE);
            return DispatchOutcome.SKIPPED;
        } catch (Exception e) {
            log.warn("SmsDispatchJob 발송 실패: queueId={}, targetId={}", row.getId(), row.getTargetId(), e);
            queueService.markFailed(row.getId(), e.toString(), props.getMaxAttempts());
            return DispatchOutcome.FAILED;
        }
    }

    private boolean inAdWindow(LocalDateTime now) {
        int h = now.getHour();
        return h >= props.getAdWindowStartHour() && h <= props.getAdWindowEndHour();
    }

    /**
     * 재시도 무의미한 SKIP 사유 판정 — 대상 삭제·수신거부·번호무효·문구미설정 등.
     * SmsSendService 안의 detail 문자열을 근사 매칭. 목록이 바뀌면 여기도 조정한다.
     */
    private static boolean isTerminalSkip(String detail) {
        return detail.contains("대상이 존재하지")
                || detail.contains("수신거부")
                || detail.contains("발송 불가")
                || detail.contains("연락처가 없")
                || detail.contains("문구가 설정되지")
                || detail.contains("지연 문구가 설정되지");
    }

    private enum DispatchOutcome { SUCCESS, FAILED, SKIPPED, CANCELED }
}
