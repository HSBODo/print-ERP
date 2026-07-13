package com.bviit.analytics.batch;

import com.bviit.analytics.batch.dto.BatchRunLog;
import com.bviit.analytics.batch.job.ConsultationMartJob;
import com.bviit.analytics.batch.job.EtcMartJob;
import com.bviit.analytics.batch.job.ExamMartJob;
import com.bviit.analytics.batch.job.OutpatientMartJob;
import com.bviit.analytics.batch.job.OverallMartJob;
import com.bviit.analytics.batch.job.ReservationMartJob;
import com.bviit.analytics.batch.job.ReservationStatsDailyMartJob;
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
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * 배치 진입점. 매일/매월 스케줄로 각 도메인 잡(surgery·reservation·exam·consultation·
 * outpatient·overall·etc)을 순차 실행한다.
 *
 * 관련 문서: docs/databatch/strategy.md §5, §6
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class BatchOrchestrator {

    static final String ORCHESTRATOR_JOB_PREFIX = "orchestrator";
    private static final Set<Domain> ALL_DOMAINS = EnumSet.allOf(Domain.class);

    /** 마트 도메인 식별자. Admin API/스케줄러가 부분 실행 지정에 사용. */
    public enum Domain { SURGERY, RESERVATION, EXAM, CONSULTATION, OUTPATIENT, OVERALL, ETC }

    private final BatchRunLogRepository runLogRepository;
    private final SurgeryMartJob surgeryMartJob;
    private final ReservationMartJob reservationMartJob;
    private final ReservationStatsDailyMartJob reservationStatsDailyMartJob;
    private final ExamMartJob examMartJob;
    private final ConsultationMartJob consultationMartJob;
    private final OutpatientMartJob outpatientMartJob;
    private final OverallMartJob overallMartJob;
    private final EtcMartJob etcMartJob;

    @Value("${batch.mart.enabled:true}")
    private boolean enabled;

    /**
     * 스케줄러가 덮어쓰지 않는 연도 하한. 2024·2025 는 확정값(하드코딩 or 수동 seed)이므로
     * 자동 배치가 실수로 재계산·덮어쓰기 하지 않도록 방어한다.
     * 관리자 수동 실행(runManual)은 이 가드를 우회 — 초기 backfill/보정 시 필요.
     */
    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    /**
     * 매일 03:00 — 어제(D-1) 하루치 append.
     * cron="-"이면 스케줄러가 등록되지 않음(관리자 수동 실행만 사용하고 싶을 때).
     * D-1의 연도가 min-year 미만이면 skip (년말·년초 경계 안전).
     */
    @Scheduled(cron = "${batch.mart.daily-cron:0 0 3 * * *}", zone = "Asia/Seoul")
    public void runDaily() {
        if (!enabled) {
            log.info("Batch disabled — skip daily run");
            return;
        }
        LocalDate yesterday = LocalDate.now().minusDays(1);
        if (yesterday.getYear() < minYear) {
            log.info("Batch skip daily — target year {} < min-year {}", yesterday.getYear(), minYear);
            return;
        }
        runWithLog(BatchRunLog.RunType.DAILY, yesterday, yesterday, ALL_DOMAINS,
                () -> runAllDomains(yesterday, yesterday));
    }

    /**
     * 매월 1일 03:30 — 전월 전체 재계산 (소급 수정 흡수).
     * 전월의 연도가 min-year 미만이면 skip.
     *
     * 별개 잡 클래스(MonthlyReconcileJob)가 아니라 daily와 동일한 도메인 잡을 넓은 범위로
     * 재실행하는 방식이다. 소급 수정은 각 잡이 자연스럽게 흡수:
     *   - Monthly 마트: ON CONFLICT DO UPDATE 로 값 덮어쓰기
     *   - Daily 마트:   해당 날짜 upsert (덮어쓰기)
     *   - List 마트:    범위 delete + 재조회 insert → 취소·삭제분까지 반영
     * daily와의 차이는 오직 (a) 처리 범위, (b) batch_run_log.run_type 값.
     * 관련: strategy.md §2 결정 1 완화책
     */
    @Scheduled(cron = "${batch.mart.monthly-reconcile-cron:0 30 3 1 * *}", zone = "Asia/Seoul")
    public void runMonthlyReconcile() {
        if (!enabled) {
            log.info("Batch disabled — skip monthly reconcile");
            return;
        }
        YearMonth prev = YearMonth.now().minusMonths(1);
        if (prev.getYear() < minYear) {
            log.info("Batch skip monthly reconcile — target year {} < min-year {}", prev.getYear(), minYear);
            return;
        }
        LocalDate from = prev.atDay(1);
        LocalDate to = prev.atEndOfMonth();
        runWithLog(BatchRunLog.RunType.MONTHLY_RECONCILE, from, to, ALL_DOMAINS,
                () -> runAllDomains(from, to));
    }

    /**
     * 관리자 수동 실행 진입점 (Admin API에서 호출). run_type=MANUAL 로 기록.
     * min-year 가드를 따르지 않는다 — 24·25 초기 backfill/보정 시 자유롭게 사용.
     */
    public void runManual(LocalDate from, LocalDate to) {
        runManual(from, to, EnumSet.allOf(Domain.class));
    }

    /**
     * 도메인 부분 실행. 빈/null 이면 전체 실행.
     */
    public void runManual(LocalDate from, LocalDate to, Set<Domain> targets) {
        Set<Domain> resolved = (targets == null || targets.isEmpty())
                ? EnumSet.allOf(Domain.class) : EnumSet.copyOf(targets);
        runWithLog(BatchRunLog.RunType.MANUAL, from, to, resolved,
                () -> runDomains(from, to, resolved));
    }

    /**
     * 지정 도메인 잡 순차 실행. 하나가 실패하면 즉시 예외 전파(전체 run_log는 FAILED로 기록됨).
     * 반환값: 각 잡이 write한 테이블 → rows 를 통합한 맵 (batch_run_log.table_stats에 저장됨).
     */
    private Map<String, Integer> runDomains(LocalDate from, LocalDate to, Set<Domain> targets) {
        Map<String, Integer> stats = new LinkedHashMap<>();
        if (targets.contains(Domain.SURGERY))       stats.putAll(surgeryMartJob.run(from, to));
        if (targets.contains(Domain.RESERVATION)) {
            stats.putAll(reservationMartJob.run(from, to));
            stats.putAll(reservationStatsDailyMartJob.run(from, to));
        }
        if (targets.contains(Domain.EXAM))          stats.putAll(examMartJob.run(from, to));
        if (targets.contains(Domain.CONSULTATION))  stats.putAll(consultationMartJob.run(from, to));
        if (targets.contains(Domain.OUTPATIENT))    stats.putAll(outpatientMartJob.run(from, to));
        if (targets.contains(Domain.OVERALL))       stats.putAll(overallMartJob.run(from, to));
        if (targets.contains(Domain.ETC))           stats.putAll(etcMartJob.run(from, to));
        // 모든 도메인 마트 완료. 후속은 스냅샷 파일→마트 이관(strategy.md §7).
        return stats;
    }

    /** 스케줄러(전체 도메인) 진입점 — 기존 시그니처 유지. */
    private Map<String, Integer> runAllDomains(LocalDate from, LocalDate to) {
        return runDomains(from, to, EnumSet.allOf(Domain.class));
    }

    private void runWithLog(BatchRunLog.RunType type, LocalDate from, LocalDate to,
                            Set<Domain> targets, Job job) {
        String jobName = jobNameOf(targets);
        long id = runLogRepository.start(jobName, type, from, to);
        try {
            Map<String, Integer> tableStats = job.run();
            runLogRepository.success(id, tableStats);
        } catch (Exception e) {
            log.error("Batch failed: job={} type={} range={}..{}", jobName, type, from, to, e);
            runLogRepository.fail(id, e.toString());
        }
    }

    /**
     * jobName 표기 규칙:
     *   - 전체 도메인:   orchestrator[ALL]
     *   - 부분 도메인:   orchestrator[SURGERY,RESERVATION] (enum 선언 순서 유지)
     * targets 가 비어있거나 null 이면 안전하게 [ALL] 로 표기.
     */
    private static String jobNameOf(Set<Domain> targets) {
        if (targets == null || targets.isEmpty() || targets.containsAll(ALL_DOMAINS)) {
            return ORCHESTRATOR_JOB_PREFIX + "[ALL]";
        }
        String list = EnumSet.copyOf(targets).stream()
                .map(Enum::name)
                .reduce((a, b) -> a + "," + b)
                .orElse("ALL");
        return ORCHESTRATOR_JOB_PREFIX + "[" + list + "]";
    }

    @FunctionalInterface
    private interface Job {
        Map<String, Integer> run() throws Exception;
    }
}
