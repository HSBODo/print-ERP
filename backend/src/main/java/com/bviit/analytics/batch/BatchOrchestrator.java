package com.bviit.analytics.batch;

import com.bviit.analytics.batch.dto.BatchRunLog;
import com.bviit.analytics.batch.job.AccumulatedEyeMartJob;
import com.bviit.analytics.batch.job.ConsultationMartJob;
import com.bviit.analytics.batch.job.EtcMartJob;
import com.bviit.analytics.batch.job.ExamMartJob;
import com.bviit.analytics.batch.job.OutpatientMartJob;
import com.bviit.analytics.batch.job.OverallMartJob;
import com.bviit.analytics.batch.job.ReservationListHomepageMartJob;
import com.bviit.analytics.batch.job.ReportMartJob;
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

import java.time.Duration;
import java.time.Instant;
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
    public enum Domain { SURGERY, ACCUMULATED_EYES, RESERVATION, EXAM, CONSULTATION, OUTPATIENT, OVERALL, REPORT, ETC }

    private final BatchRunLogRepository runLogRepository;
    private final BatchSlackNotifier slackNotifier;
    private final SurgeryMartJob surgeryMartJob;
    private final AccumulatedEyeMartJob accumulatedEyeMartJob;
    private final ReservationMartJob reservationMartJob;
    private final ReservationStatsDailyMartJob reservationStatsDailyMartJob;
    private final ReservationListHomepageMartJob reservationListHomepageMartJob;
    private final ExamMartJob examMartJob;
    private final ConsultationMartJob consultationMartJob;
    private final OutpatientMartJob outpatientMartJob;
    private final OverallMartJob overallMartJob;
    private final ReportMartJob reportMartJob;
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
     * 매일 10:00 — 예약통계(시력교정·백내장) 일별 마트만 D-1 재실행.
     * 새벽 03:00 배치 이후 늦게 반영된 콜센터 데이터/수정분 흡수용. upsert 안전.
     * run_type=DAILY 로 기록되므로 `useBatchLastSuccess` 표시가 자연스럽게 갱신된다.
     * jobName 은 `orchestrator[RESERVATION_STATS_INTRADAY]` 로 구분.
     */
    @Scheduled(cron = "${batch.mart.reservation-stats-intraday-cron:0 0 10 * * *}", zone = "Asia/Seoul")
    public void runReservationStatsIntraday() {
        if (!enabled) {
            log.info("Batch disabled — skip reservation-stats intraday run");
            return;
        }
        LocalDate yesterday = LocalDate.now().minusDays(1);
        if (yesterday.getYear() < minYear) {
            log.info("Batch skip reservation-stats intraday — target year {} < min-year {}",
                    yesterday.getYear(), minYear);
            return;
        }
        runWithLog(BatchRunLog.RunType.DAILY, yesterday, yesterday,
                ORCHESTRATOR_JOB_PREFIX + "[RESERVATION_STATS_INTRADAY]",
                () -> reservationStatsDailyMartJob.run(yesterday, yesterday));
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
        if (targets.contains(Domain.SURGERY))          stats.putAll(surgeryMartJob.run(from, to));
        // 누적 안수는 원천(OPERATION_ACCUMULATED_EYE_COUNT) 도, 소급 특성도 다른 별개 잡.
        // 관리자 수동 배치에서 이것만 골라 재적재할 수 있도록 별도 도메인으로 분리했다.
        // daily/monthly 스케줄러는 ALL_DOMAINS 를 넘겨 두 도메인 모두 실행한다.
        if (targets.contains(Domain.ACCUMULATED_EYES)) stats.putAll(accumulatedEyeMartJob.run(from, to));
        if (targets.contains(Domain.RESERVATION)) {
            // 홈페이지 리스트 마트를 먼저 채운다 — ReservationMartJob 안의 overallStatsService
            // 가 홈페이지 몫을 mart_list_reservation_homepage 에서 읽기 때문. 순서를 바꾸면
            // 2026-01~ 온라인 예약 종합값이 홈페이지 몫만큼 조용히 작게 적재된다.
            // 소스가 MariaDB(별도 DS)라 트랜잭션·의존성이 갈려 별도 잡. 소스 미설정 시 잡 내부에서 skip.
            stats.putAll(reservationListHomepageMartJob.run(from, to));
            stats.putAll(reservationMartJob.run(from, to));
            stats.putAll(reservationStatsDailyMartJob.run(from, to));
        }
        if (targets.contains(Domain.EXAM))          stats.putAll(examMartJob.run(from, to));
        if (targets.contains(Domain.CONSULTATION))  stats.putAll(consultationMartJob.run(from, to));
        if (targets.contains(Domain.OUTPATIENT))    stats.putAll(outpatientMartJob.run(from, to));
        // OVERALL 은 EXAM 이 채운 list_exam/list_cataract_exam(v_all_exam_list 뷰) 을 읽어
        // mart_overall_exam_weekly/monthly 를 재집계한다. 반드시 EXAM 이후에 실행되어야 함.
        if (targets.contains(Domain.OVERALL))       stats.putAll(overallMartJob.run(from, to));
        // REPORT 는 EXAM 이 채운 list_exam/list_cataract_exam(v_all_exam_list 뷰) 을 읽어
        // mart_exam_count_by_class 를 재집계한다. 반드시 EXAM 이후에 실행되어야 함.
        // mart_weekly_report 는 자체 서비스 로직(list + MSSQL 브릿지 하이브리드).
        if (targets.contains(Domain.REPORT))        stats.putAll(reportMartJob.run(from, to));
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
        runWithLog(type, from, to, jobNameOf(targets), job);
    }

    private void runWithLog(BatchRunLog.RunType type, LocalDate from, LocalDate to,
                            String jobName, Job job) {
        long id = runLogRepository.start(jobName, type, from, to);
        Instant startedAt = Instant.now();
        try {
            Map<String, Integer> tableStats = job.run();
            runLogRepository.success(id, tableStats);
            slackNotifier.notifySuccess(jobName, type, from, to, tableStats,
                    Duration.between(startedAt, Instant.now()));
        } catch (Exception e) {
            log.error("Batch failed: job={} type={} range={}..{}", jobName, type, from, to, e);
            runLogRepository.fail(id, e.toString());
            slackNotifier.notifyFailure(jobName, type, from, to, e.toString(),
                    Duration.between(startedAt, Instant.now()));
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
