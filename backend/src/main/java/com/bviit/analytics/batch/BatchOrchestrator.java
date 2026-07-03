package com.bviit.analytics.batch;

import com.bviit.analytics.batch.dto.BatchRunLog;
import com.bviit.analytics.batch.job.ConsultationMartJob;
import com.bviit.analytics.batch.job.ExamMartJob;
import com.bviit.analytics.batch.job.OutpatientMartJob;
import com.bviit.analytics.batch.job.ReservationMartJob;
import com.bviit.analytics.batch.job.SurgeryMartJob;
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
 * 배치 진입점. 매일/매월 스케줄로 각 도메인 잡을 순차 실행한다.
 *
 * PR-2 시점: 수술 도메인만 활성. 후속 PR에서 예약/검사/… 잡을 추가한다.
 * 관련 문서: docs/databatch/strategy.md §6
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class BatchOrchestrator {

    static final String ORCHESTRATOR_JOB = "orchestrator";

    private final BatchRunLogRepository runLogRepository;
    private final SurgeryMartJob surgeryMartJob;
    private final ReservationMartJob reservationMartJob;
    private final ExamMartJob examMartJob;
    private final ConsultationMartJob consultationMartJob;
    private final OutpatientMartJob outpatientMartJob;

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
        runWithLog(BatchRunLog.RunType.DAILY, yesterday, yesterday,
                () -> runAllDomains(yesterday, yesterday));
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
        runWithLog(BatchRunLog.RunType.MONTHLY_RECONCILE, from, to,
                () -> runAllDomains(from, to));
    }

    /**
     * 관리자 수동 실행 진입점 (Admin API에서 호출). run_type=MANUAL 로 기록.
     */
    public void runManual(LocalDate from, LocalDate to) {
        runWithLog(BatchRunLog.RunType.MANUAL, from, to,
                () -> runAllDomains(from, to));
    }

    /**
     * 도메인 잡 순차 실행. 하나가 실패하면 즉시 예외 전파(전체 run_log는 FAILED로 기록됨).
     * 향후 도메인이 추가되면 여기 등록.
     */
    private int runAllDomains(LocalDate from, LocalDate to) {
        int total = 0;
        total += surgeryMartJob.run(from, to);
        total += reservationMartJob.run(from, to);
        total += examMartJob.run(from, to);
        total += consultationMartJob.run(from, to);
        total += outpatientMartJob.run(from, to);
        // TODO(PR-12+): overall, etc, ...
        return total;
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
