package com.bviit.analytics.batch;

import com.bviit.analytics.batch.dto.BatchRunLog;
import com.bviit.analytics.batch.repository.BatchRunLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * 배치 진입점. 매일/매월 스케줄로 마트 잡을 순차 실행한다.
 *
 * 현재는 뼈대 — 실제 도메인 잡(SurgeryDailyMartJob 등)은 후속 PR에서 추가한다.
 * PR-1 시점에는 스케줄러가 켜져 있는지, 실행 이력이 batch_run_log에 남는지만 확인.
 *
 * 관련 문서: docs/databatch/strategy.md §6
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class BatchOrchestrator {

    static final String ORCHESTRATOR_JOB = "orchestrator";

    private final BatchRunLogRepository runLogRepository;

    @Value("${batch.mart.enabled:true}")
    private boolean enabled;

    /**
     * 매일 03:00 — 어제(D-1) 하루치 append.
     * cron="-"이면 스케줄러가 등록되지 않음(관리자 수동 실행만 사용하고 싶을 때).
     */
    @Scheduled(cron = "${batch.mart.daily-cron:0 0 3 * * *}", zone = "Asia/Seoul")
    public void runDaily() {
        if (!enabled) {
            log.info("Batch disabled — skip daily run");
            return;
        }
        LocalDate yesterday = LocalDate.now().minusDays(1);
        runWithLog(BatchRunLog.RunType.DAILY, yesterday, yesterday, () -> {
            // TODO(PR-2+): 도메인 잡 순차 실행 (surgery → reservation → exam → ...)
            log.info("[daily] target={} — no jobs registered yet", yesterday);
            return 0;
        });
    }

    /**
     * 매월 1일 03:30 — 전월 전체 재계산 (소급 수정 흡수).
     */
    @Scheduled(cron = "${batch.mart.monthly-reconcile-cron:0 30 3 1 * *}", zone = "Asia/Seoul")
    public void runMonthlyReconcile() {
        if (!enabled) {
            log.info("Batch disabled — skip monthly reconcile");
            return;
        }
        YearMonth prev = YearMonth.now().minusMonths(1);
        LocalDate from = prev.atDay(1);
        LocalDate to = prev.atEndOfMonth();
        runWithLog(BatchRunLog.RunType.MONTHLY_RECONCILE, from, to, () -> {
            // TODO(PR-2+): 도메인 잡 전월 재계산 (upsert)
            log.info("[monthly-reconcile] range={}..{} — no jobs registered yet", from, to);
            return 0;
        });
    }

    /**
     * 관리자 수동 실행 진입점 (Admin API에서 호출). run_type=MANUAL 로 기록.
     */
    public void runManual(LocalDate from, LocalDate to) {
        runWithLog(BatchRunLog.RunType.MANUAL, from, to, () -> {
            // TODO(PR-2+): 지정 범위 잡 실행
            log.info("[manual] range={}..{} — no jobs registered yet", from, to);
            return 0;
        });
    }

    private void runWithLog(BatchRunLog.RunType type, LocalDate from, LocalDate to, Job job) {
        long id = runLogRepository.start(ORCHESTRATOR_JOB, type, from, to);
        try {
            int rows = job.run();
            runLogRepository.success(id, rows);
        } catch (Exception e) {
            log.error("Batch failed: type={} range={}..{}", type, from, to, e);
            runLogRepository.fail(id, e.toString());
        }
    }

    @FunctionalInterface
    private interface Job {
        int run() throws Exception;
    }
}
