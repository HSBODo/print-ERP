package com.bviit.analytics.batch;

import com.bviit.analytics.batch.dto.BatchRunLog;
import com.bviit.analytics.batch.job.AccountingMartJob;
import com.bviit.analytics.batch.job.AccumulatedEyeMartJob;
import com.bviit.analytics.batch.job.ConsultationMartJob;
import com.bviit.analytics.batch.job.EtcMartJob;
import com.bviit.analytics.batch.job.ExamMartJob;
import com.bviit.analytics.batch.job.OutpatientMartJob;
import com.bviit.analytics.batch.job.OverallMartJob;
import com.bviit.analytics.batch.job.ReservationChangeMartJob;
import com.bviit.analytics.batch.job.ReservationListHomepageMartJob;
import com.bviit.analytics.batch.job.ReportMartJob;
import com.bviit.analytics.batch.job.ReservationMartJob;
import com.bviit.analytics.batch.job.ReservationStatsDailyMartJob;
import com.bviit.analytics.batch.job.SmsImportJob;
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
    /**
     * 자동 월배치·관리자 수동 "전체 도메인 재실행" 공통 대상. SMS 만 제외.
     *
     * <p>SMS 는 실제 문자 발송 대상 테이블(sms_target)을 재적재한다 — 관리자가 다른 통계 도메인과
     * 함께 무심코 돌리지 않도록 분리. SMS 만 재적재하려면 관리자 UI 의 "문자 발송 대상만" 옵션을 쓴다.
     *
     * <p>자동 월배치(runMonthlyReconcile)에서도 이 세트를 쓴다 — 2026-10-01 사고 재발 방지
     * (docs/sms/incidents/2026-10-01-reconcile-bulk-dispatch.md). 월배치가 뒤늦게 발견한 수술자의
     * 과거-예정 T1~T3 가 enqueue 시 clamp 되어 몇 분 안에 몰려 발송되는 문제. 일배치(runDaily)는
     * D-1 만 처리 → scheduled 가 미래 → clamp 안 걸림 → ALL_DOMAINS 유지해도 안전.
     *
     * <p>⚠️ 알려진 트레이드오프: 일배치가 어떤 이유(마트 적재 지연 등)로 수술자를 놓치면 월배치도
     * 안 돌리므로 그 사람은 안내 못 받음. Phase 3 (일배치가 수술자를 놓치는 경로 조사·보완) 가
     * 완료되기 전까지의 임시 수용.
     */
    private static final Set<Domain> MANUAL_ALL_DOMAINS = EnumSet.complementOf(EnumSet.of(Domain.SMS));

    /** 마트 도메인 식별자. Admin API/스케줄러가 부분 실행 지정에 사용. */
    public enum Domain { SURGERY, ACCUMULATED_EYES, RESERVATION, RESERVATION_CHANGE, EXAM, CONSULTATION, OUTPATIENT, OVERALL, REPORT, ETC, ACCOUNTING, SMS }

    private final BatchRunLogRepository runLogRepository;
    private final BatchSlackNotifier slackNotifier;
    private final SurgeryMartJob surgeryMartJob;
    private final AccumulatedEyeMartJob accumulatedEyeMartJob;
    private final ReservationMartJob reservationMartJob;
    private final ReservationStatsDailyMartJob reservationStatsDailyMartJob;
    private final ReservationListHomepageMartJob reservationListHomepageMartJob;
    private final ReservationChangeMartJob reservationChangeMartJob;
    private final ExamMartJob examMartJob;
    private final ConsultationMartJob consultationMartJob;
    private final OutpatientMartJob outpatientMartJob;
    private final OverallMartJob overallMartJob;
    private final ReportMartJob reportMartJob;
    private final EtcMartJob etcMartJob;
    private final AccountingMartJob accountingMartJob;
    private final SmsImportJob smsImportJob;

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
     * 매일 03:00 — <b>SMS 제외</b> 전체 도메인은 <b>D-1 이 속한 달의 1일부터 D-1 까지</b> Rolling 재실행,
     * <b>SMS 는 D-1 하루</b>만 처리.
     *
     * <p>Rolling 로 바꾼 이유: D-1 only 적재는 과거 날짜에 뒤늦게 반영된 수정·취소분을
     * 월간 reconcile 전까지 영원히 놓친다. 당월 전체를 매일 upsert 하면 소급 변동이 다음날 반영된다.
     * 설계 패턴은 월간 reconcile({@link #runMonthlyReconcile()}) 과 동일 — 범위만 당월로 바뀐 것.
     *
     * <p>SMS 가 D-1 로 분리된 이유: 2026-10-01 사고 재발 방지
     * ({@code docs/sms/incidents/2026-10-01-reconcile-bulk-dispatch.md}). 일배치가 과거 날짜로
     * 넓어지면 뒤늦게 발견된 수술자의 과거-예정 T1~T3 알림톡이 enqueue 시 clamp 되어 몇 분 안에
     * 몰려 발송된다. SMS 는 반드시 D-1 하루만 처리.
     *
     * <p>안전 근거 (SMS 외 도메인):
     * <ul>
     *   <li>upsert 멱등 — 매일 돌아도 결과 동일.
     *   <li>수기 수정 보호 — dreamlens(source=MANUAL skip), 예약통계 override(별도 overlay),
     *       해외마케팅(origin='manual'/locked_at/updated_by 보존) 모두 Rolling 과 무관하게 보존.
     *   <li>범위가 당월 한정 — 확정된 과거 월은 애초에 범위 밖.
     * </ul>
     *
     * <p>트레이드오프: MSSQL 원본 조회량이 월 중순 15일치, 월말 30일치로 증가. 03:00 윈도우 모니터링 필요.
     *
     * <p>cron="-"이면 스케줄러가 등록되지 않음(관리자 수동 실행만 사용하고 싶을 때).
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
        LocalDate from = yesterday.withDayOfMonth(1);
        // SMS 제외 전체 도메인 — Rolling (월초~D-1)
        runWithLog(BatchRunLog.RunType.DAILY, from, yesterday, MANUAL_ALL_DOMAINS,
                () -> runDomains(from, yesterday, MANUAL_ALL_DOMAINS));
        // SMS 전용 — D-1 하루 유지 (2026-10-01 사고 재발 방지)
        Set<Domain> smsOnly = EnumSet.of(Domain.SMS);
        runWithLog(BatchRunLog.RunType.DAILY, yesterday, yesterday, smsOnly,
                () -> runDomains(yesterday, yesterday, smsOnly));
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
        // SMS 는 MANUAL_ALL_DOMAINS 가 제외한다 — 2026-10-01 사고 재발 방지.
        // 월배치가 뒤늦게 발견한 수술자의 과거-예정 T1~T3 가 enqueue 시 clamp 되어 몰려 발송되는 문제.
        runWithLog(BatchRunLog.RunType.MONTHLY_RECONCILE, from, to, MANUAL_ALL_DOMAINS,
                () -> runDomains(from, to, MANUAL_ALL_DOMAINS));

        // 원데이 검사 소급 보정 (전전월~전월, 2개월) — 재검사 예약이 시간차로 등록되는 성격이라
        // 매월 보정 범위(전월)를 넘어 그전 달까지 다시 훑는다. 원본 사용자 SQL 취지 유지.
        // list_exam UPDATE + 그 월 mart_procedure_exam_monthly 재집계는 ExamMartJob 안에서 원자적.
        // 별도 runWithLog 라 batch_run_log 이력·Slack 알림이 ALL_DOMAINS 와 분리 (관측 명확).
        LocalDate onedayFrom = from.minusMonths(1);
        LocalDate onedayTo = to;
        if (onedayFrom.getYear() >= minYear) {
            runWithLog(BatchRunLog.RunType.MONTHLY_RECONCILE, onedayFrom, onedayTo,
                    "reconcile-oneday-flag",
                    () -> examMartJob.reconcileOnedayFlag(onedayFrom, onedayTo));
        } else {
            log.info("Batch skip oneday reconcile — target year {} < min-year {}",
                    onedayFrom.getYear(), minYear);
        }
        // 회계는 원천 전표의 오래된 취소·삭제도 반영해야 한다. 전월은 위에서 처리했으므로 제외.
        // 다른 도메인의 과거 확정값(min-year)은 재적재하지 않는다.
        LocalDate historyFrom = LocalDate.of(2023, 1, 1);
        LocalDate historyTo = from.minusDays(1);
        if (!historyFrom.isAfter(historyTo)) {
            runWithLog(BatchRunLog.RunType.MONTHLY_RECONCILE, historyFrom, historyTo,
                    "reconcile-accounting-history", () -> reconcileAccountingHistory(historyFrom, historyTo));
        }
    }

    /** 월 단위 트랜잭션으로 메모리·잠금 범위를 제한한다. 전체 이력은 하나의 실행 로그에 기록. */
    private Map<String, Integer> reconcileAccountingHistory(LocalDate from, LocalDate to) {
        Map<String, Integer> stats = new LinkedHashMap<>();
        for (YearMonth month = YearMonth.from(from); !month.isAfter(YearMonth.from(to)); month = month.plusMonths(1)) {
            accountingMartJob.run(month.atDay(1), month.atEndOfMonth())
                    .forEach((table, count) -> stats.merge(table, count, Integer::sum));
        }
        return stats;
    }

    /**
     * 관리자 수동 실행 진입점 (Admin API에서 호출). run_type=MANUAL 로 기록.
     * min-year 가드를 따르지 않는다 — 24·25 초기 backfill/보정 시 자유롭게 사용.
     */
    public void runManual(LocalDate from, LocalDate to) {
        runManual(from, to, MANUAL_ALL_DOMAINS);
    }

    /**
     * 원데이 검사 소급 보정만 수동 재실행 (Admin API에서 호출).
     *
     * <p>정기 흐름은 {@link #runMonthlyReconcile} 이 매월 1일 03:30 자동 트리거하지만,
     * 재실행이 필요한 상황(스케줄러 실패·특정 범위 backfill·개발 검증) 을 위해 별도 진입점을 둔다.
     * min-year 가드 없음 — {@link #runManual} 과 같은 정신.
     *
     * <p>batch_run_log 는 MANUAL 로 기록. Slack 알림도 자동. 관측은 정기 배치와 통일.
     */
    public void runManualOnedayReconcile(LocalDate from, LocalDate to) {
        runWithLog(BatchRunLog.RunType.MANUAL, from, to,
                "reconcile-oneday-flag",
                () -> examMartJob.reconcileOnedayFlag(from, to));
    }

    /**
     * 도메인 부분 실행. 빈/null 이면 전체 실행.
     */
    public void runManual(LocalDate from, LocalDate to, Set<Domain> targets) {
        Set<Domain> resolved = (targets == null || targets.isEmpty())
                ? MANUAL_ALL_DOMAINS : EnumSet.copyOf(targets);
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
        // 예약 변경이력 — 범위 의미가 다르다(이력 저장 기간 · 등록일 아님). 어제 손댄 예약을 다시 접어 upsert.
        // 초기 백필(2022~)을 월 단위로 이것만 돌릴 수 있도록 ACCUMULATED_EYES 처럼 별도 도메인으로 뒀다.
        if (targets.contains(Domain.RESERVATION_CHANGE)) stats.putAll(reservationChangeMartJob.run(from, to));
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
        // 회계 — 시력교정 매출(SOFTCRM) + 진료 수납(의사랑 링크드서버). 범위 = 수납일. 다른 도메인과 의존 없음.
        if (targets.contains(Domain.ACCOUNTING))    stats.putAll(accountingMartJob.run(from, to));
        // SMS 는 list_surgery 를 소스로 읽어 sms_target 에 적재하므로 SURGERY 뒤에 실행.
        // Phase 1B — 지금까지 화면 조회가 즉석 upsert 하던 임시 경로를 배치로 승격했다.
        if (targets.contains(Domain.SMS))           stats.putAll(smsImportJob.run(from, to));
        // 모든 도메인 마트 완료. 후속은 스냅샷 파일→마트 이관(strategy.md §7).
        return stats;
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
            if (tableStats.getOrDefault("list_medical_receipt_failed", 0) > 0) {
                String message = "회계 진료 수납 적재 실패: 시력교정 등 완료된 적재는 보존됨. 해당 기간 재실행 필요.";
                runLogRepository.fail(id, message, tableStats);
                slackNotifier.notifyFailure(jobName, type, from, to, message,
                        Duration.between(startedAt, Instant.now()));
                return;
            }
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
        if (targets.equals(MANUAL_ALL_DOMAINS)) {
            return ORCHESTRATOR_JOB_PREFIX + "[ALL_EXCEPT_SMS]";
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
