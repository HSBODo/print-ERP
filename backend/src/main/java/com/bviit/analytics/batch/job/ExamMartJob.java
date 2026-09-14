package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import com.bviit.analytics.exam.dto.ExaminationMonthlyItem;
import com.bviit.analytics.exam.dto.ProcedureExamMonthlyItem;
import com.bviit.analytics.exam.repository.ExamOnedayReconcileRepository;
import com.bviit.analytics.exam.repository.ExamOnedayReconcileRepository.ChartDate;
import com.bviit.analytics.exam.repository.ExamStatsMartRepository;
import com.bviit.analytics.exam.service.CataractExamListService;
import com.bviit.analytics.exam.service.ExamListService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 검사 도메인 마트 적재 잡.
 *
 * 네 개의 마트를 채운다:
 *   - mart_examination_monthly     — (yr,mo) upsert (min-year 가드로 24·25 write 차단)
 *   - mart_procedure_exam_monthly  — 동일하게 (yr,mo) upsert (min-year 가드로 24·25 write 차단)
 *   - list_exam                    — from..to 검사일 범위 delete+insert
 *   - list_cataract_exam           — from..to 검사일 범위 delete+insert
 *
 * 리스트(list_exam·list_cataract_exam)는 MSSQL 서비스에서 읽어 적재하고,
 * 월별 두 마트는 **그 리스트를 월로 접어** 만든다(v_all_exam_list). 화면 리스트와 정의가 하나다.
 *
 * examination·procedure_exam 24·25 확정값은 V9 seed가 mart에 넣은 값을 유일 원천으로 유지한다.
 * runManual로 24·25 범위를 실행해도 두 monthly upsert 는 min-year 이상 연도만 수행.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ExamMartJob {

    static final String MART_NAME = "exam";

    private final ExamStatsMartRepository examStatsMartRepository;
    private final ExamListService examListService;
    private final CataractExamListService cataractExamListService;
    private final ExamMartWriter writer;
    private final BatchSuccessLogRepository successLogRepository;
    private final ExamOnedayReconcileRepository onedayReconcileRepository;

    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    /**
     * from..to 범위를 적재한다. 반환값은 upsert/insert된 총 행 수 (관측용).
     *
     * 트랜잭션: 도메인 단위 all-or-nothing. examination/procedure/exam-list/cataract-exam-list/성공 로그
     * 중 하나라도 실패하면 모두 롤백. MSSQL 읽기는 별도 datasource이므로 이 트랜잭션과 무관.
     */
    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("ExamMartJob start: range={}..{}", from, to);

        // ── 순서 주의 ──────────────────────────────────────────────
        // 리스트를 **먼저** 적재한다. 월별 집계가 그 리스트(v_all_exam_list)를 읽기 때문이다.
        // 종전에는 월별이 먼저였고 MSSQL 을 각자 조회했다 — 같은 지표가 두 벌로 구현돼
        // 정의가 바뀌면 어긋났다(2026-08-05 원데이 3건).
        // ──────────────────────────────────────────────────────────

        // 1) List exam delete+insert
        List<Map<String, Object>> examListRows =
                examListService.getExamList(from.toString(), to.toString());
        int examListInserted = writer.replaceListExam(from, to, examListRows);

        // 2) List cataract exam delete+insert
        List<Map<String, Object>> cataractListRows =
                cataractExamListService.getCataractExamList(from.toString(), to.toString());
        int cataractListInserted = writer.replaceListCataractExam(from, to, cataractListRows);

        // 3) 월별 집계 — 방금 적재한 리스트를 월로 접는다(= 화면 리스트와 같은 정의).
        //    min-year 미만 연도는 V9 seed 보존, 2026-01~05 는 V22·V27 골든 시드 구간 — 둘 다 스킵.
        //
        //    ⚠️ from..to 를 그대로 접으면 안 된다. 이 잡은 하루짜리 범위로도 불린다(매일 03시 D-1 배치).
        //       그때 리스트 조회는 D-1 하루만 돌려주는데, 월별 upsert 는 EXCLUDED 값으로 통으로 덮어써
        //       그 달 monthly 가 하루치로 리셋된다. 수술 도메인이 2026-08-06 실제로 그렇게 만들었다가
        //       7월 수술수가 861→34 로 무너졌다(SurgeryMartJob 참조).
        //       월별은 언제나 "그 달 전체의 합" 이어야 하므로 범위를 달 경계로 넓혀 다시 읽는다.
        //       list_exam·list_cataract_exam 은 데일리마다 D-1 범위 delete+insert 라 그 달 전체 행이 살아있다.
        LocalDate monthFrom = from.withDayOfMonth(1);
        LocalDate monthTo = to.withDayOfMonth(to.lengthOfMonth());
        Map<YearMonth, ExamDailyAgg> byMonth = aggregateByMonth(
                examStatsMartRepository.findExamDailyAgg(monthFrom.toString(), monthTo.toString()));

        List<ExaminationMonthlyItem> examinationMonthly = byMonth.entrySet().stream()
                .filter(e -> e.getKey().getYear() >= minYear)
                .filter(e -> !is2026H1Seeded(e.getKey().getYear(), e.getKey().getMonthValue()))
                .filter(e -> isMonthInRange(e.getKey().getYear(), e.getKey().getMonthValue(), from, to))
                .map(e -> ExaminationMonthlyItem.builder()
                        .year(e.getKey().getYear())
                        .month(e.getKey().getMonthValue())
                        .visionCorrection(e.getValue().vision)
                        .dreamlens(e.getValue().dreamlens)
                        // 백내장 '검사수' 는 분류 백내장+중단만(=56). 모집단 전체(102)가 아니다.
                        .cataract(e.getValue().cataractExam)
                        .total(e.getValue().total)
                        .build())
                .toList();
        int examinationRows = writer.upsertExaminationMonthly(examinationMonthly);

        List<ProcedureExamMonthlyItem> procedureMonthly = byMonth.entrySet().stream()
                .filter(e -> e.getKey().getYear() >= minYear)
                .filter(e -> !is2026H1Seeded(e.getKey().getYear(), e.getKey().getMonthValue()))
                .filter(e -> isMonthInRange(e.getKey().getYear(), e.getKey().getMonthValue(), from, to))
                .map(e -> ProcedureExamMonthlyItem.builder()
                        .year(e.getKey().getYear())
                        .month(e.getKey().getMonthValue())
                        .examCount(e.getValue().total)
                        .oneDayExamCount(e.getValue().oneDay)
                        .total(e.getValue().total)
                        .build())
                .toList();
        int procedureRows = writer.upsertProcedureExamMonthly(procedureMonthly);

        // 5) 성공 로그 갱신 (성공 시에만)
        successLogRepository.upsert(MART_NAME, to);

        Map<String, Integer> stats = Map.of(
                "mart_examination_monthly", examinationRows,
                "mart_procedure_exam_monthly", procedureRows,
                "list_exam", examListInserted,
                "list_cataract_exam", cataractListInserted
        );
        log.info("ExamMartJob done: {}", stats);
        return stats;
    }

    /**
     * 원데이 검사 소급 보정 — 매월 보정 배치 후처리로 부른다.
     *
     * <p><b>왜 별도 메서드인가</b> — run() 은 매일 D-1 하루짜리 범위로도 불린다.
     * 원데이 보정은 재검사 예약이 시간차로 등록되는 성격이라 매일 돌릴 필요 없고,
     * 매월 보정(전전월~전월) 시점에만 소급 반영하면 충분하다.
     * BatchOrchestrator.runMonthlyReconcile 이 ALL_DOMAINS 재생성 후 명시적으로 호출한다.
     *
     * <p><b>흐름</b>
     * <ol>
     *   <li>MSSQL 원본에서 "검사일 이후 재검사(RESERVE_FLAG='M'·RESERVE_JINRYO='2') 예약이
     *       등록된" (chart_no, exam_date) 쌍 조회.</li>
     *   <li>Postgres list_exam 에서 그 쌍 중 현재 one_day='Y' 인 행만 'N' 으로 UPDATE.</li>
     *   <li>그 범위의 mart_procedure_exam_monthly 재집계 (one_day_exam_count 갱신).
     *       list_exam 이 원천이라 UPDATE 뒤 monthly 를 다시 접지 않으면 두 마트가 어긋난다.</li>
     * </ol>
     *
     * <p><b>트랜잭션</b> — 이 메서드 안 세 단계가 하나의 트랜잭션.
     * 실패 시 UPDATE 도 monthly 재집계도 통째로 롤백된다.
     *
     * <p><b>필터</b> — min-year · 2026-H1 시드 구간 · from..to 는 그대로 run() 규칙 재사용.
     */
    @Transactional
    public Map<String, Integer> reconcileOnedayFlag(LocalDate from, LocalDate to) {
        log.info("ExamMartJob reconcileOnedayFlag start: range={}..{}", from, to);

        // 1) MSSQL 후보 조회
        List<ChartDate> candidates = onedayReconcileRepository.findLaterReexamCandidates(from, to);
        if (candidates.isEmpty()) {
            log.info("ExamMartJob reconcileOnedayFlag: no candidates in {}..{}", from, to);
            // 후보 0건이면 UPDATE·재집계 skip. stats 도 0/0 으로 다른 배치와 rowsUpserted 개념 통일.
            return Map.of("oneday_reconciled", 0, "mart_procedure_exam_monthly_reconciled", 0);
        }

        // 후보 (chart_no|exam_date) 목록을 한 줄로 남긴다.
        // Why: batch_run_log.rows_upserted 는 합계만 담아서, 나중에 "그 78건이 뭐였냐" 를 되짚을 방법이 없다.
        //      UPDATE 후에는 list_exam 상 표식이 없어 사후 재구성도 불가능 — 그 시점의 원본 상태를 로그로 봉인해둔다.
        String candidateSummary = candidates.stream()
                .map(c -> c.chartNo() + "|" + c.examDate())
                .collect(Collectors.joining(", "));
        log.info("ExamMartJob reconcileOnedayFlag candidates ({}): [{}]", candidates.size(), candidateSummary);

        // 2) Postgres list_exam UPDATE — RETURNING 으로 실제 뒤집힌 쌍만 회수.
        //    Why: candidates 로그(=MSSQL 후보 전체) 는 뒤집힌 것 + 이미 'N' 이던 것 다 포함.
        //         "실제로 무엇이 바뀌었나" 를 잡아 두어야 사후 감사·정합 확인이 된다.
        List<ChartDate> updatedPairs = onedayReconcileRepository.markOnedayAsNormal(candidates);
        int updated = updatedPairs.size();
        if (updated > 0) {
            String updatedSummary = updatedPairs.stream()
                    .map(c -> c.chartNo() + "|" + c.examDate())
                    .collect(Collectors.joining(", "));
            log.info("ExamMartJob reconcileOnedayFlag updated pairs ({}): [{}]", updated, updatedSummary);
        }

        // 3) monthly 재집계 — 후보에 실제 존재하는 월만 갱신 (from..to 전체가 아님).
        //    후보 검사일에서 YearMonth 를 뽑아 affectedMonths 로 좁힌다. 예: 후보가 7월만 있으면
        //    8월 monthly 는 재계산 대상이 아니다 (원데이 카운트가 바뀔 리 없다).
        //    upsertProcedureExamMonthly 는 idempotent 라 안 좁혀도 사고는 안 나지만, 관측·CPU 관점에서
        //    "무엇이 왜 재집계됐는지" 신호가 명확해진다.
        Set<YearMonth> affectedMonths = candidates.stream()
                .map(c -> YearMonth.parse(c.examDate().substring(0, 7)))
                .collect(Collectors.toSet());

        LocalDate monthFrom = affectedMonths.stream().min(YearMonth::compareTo).orElseThrow().atDay(1);
        LocalDate monthTo = affectedMonths.stream().max(YearMonth::compareTo).orElseThrow().atEndOfMonth();
        Map<YearMonth, ExamDailyAgg> byMonth = aggregateByMonth(
                examStatsMartRepository.findExamDailyAgg(monthFrom.toString(), monthTo.toString()));

        List<ProcedureExamMonthlyItem> procedureMonthly = byMonth.entrySet().stream()
                .filter(e -> affectedMonths.contains(e.getKey()))
                .filter(e -> e.getKey().getYear() >= minYear)
                .filter(e -> !is2026H1Seeded(e.getKey().getYear(), e.getKey().getMonthValue()))
                .map(e -> ProcedureExamMonthlyItem.builder()
                        .year(e.getKey().getYear())
                        .month(e.getKey().getMonthValue())
                        .examCount(e.getValue().total)
                        .oneDayExamCount(e.getValue().oneDay)
                        .total(e.getValue().total)
                        .build())
                .toList();
        int procedureRows = writer.upsertProcedureExamMonthly(procedureMonthly);

        // stats 에는 실제 반영 행 수만 남긴다 — batch_run_log.rows_upserted 는 tableStats 합계라
        // 후보 수(조회만 · upsert 아님) 를 포함하면 다른 배치와 의미가 어긋난다.
        // 후보 카운트는 진단용으로 로그에만 남긴다.
        log.info("ExamMartJob reconcileOnedayFlag done: candidates={}, list_updated={}, monthly_upserted={}",
                candidates.size(), updated, procedureRows);
        return Map.of(
                "oneday_reconciled", updated,
                "mart_procedure_exam_monthly_reconciled", procedureRows
        );
    }

    /** 일별 집계를 월로 접는다. 주차 레포트는 같은 행을 ISO 주차로 접는다(정의는 뷰 하나). */
    private static Map<YearMonth, ExamDailyAgg> aggregateByMonth(List<Map<String, Object>> dailyRows) {
        Map<YearMonth, ExamDailyAgg> byMonth = new LinkedHashMap<>();
        for (Map<String, Object> row : dailyRows) {
            LocalDate day = ((java.sql.Date) row.get("d")).toLocalDate();
            ExamDailyAgg acc = byMonth.computeIfAbsent(YearMonth.from(day), k -> new ExamDailyAgg());
            acc.total        += intOf(row, "total");
            acc.vision       += intOf(row, "vision");
            acc.dreamlens    += intOf(row, "dreamlens");
            acc.cataractExam += intOf(row, "cataract_exam");
            acc.oneDay       += intOf(row, "one_day");
        }
        return byMonth;
    }

    private static int intOf(Map<String, Object> row, String key) {
        Object v = row.get(key);
        return v instanceof Number n ? n.intValue() : 0;
    }

    /** 월 단위 누적기 — 필드는 select-exam-daily-agg.sql 의 컬럼과 1:1. */
    private static final class ExamDailyAgg {
        private int total, vision, dreamlens, cataractExam, oneDay;
    }

    /** (year, month)가 [from, to] 구간과 겹치는지 판정. */
    private static boolean isMonthInRange(int year, int month, LocalDate from, LocalDate to) {
        YearMonth ym = YearMonth.of(year, month);
        YearMonth ymFrom = YearMonth.from(from);
        YearMonth ymTo = YearMonth.from(to);
        return !ym.isBefore(ymFrom) && !ym.isAfter(ymTo);
    }

    /**
     * 2026-01~05 골든 시드 구간 판정.
     * V22(cataract) + V27(vision/dreamlens, procedure_exam) 이 담당자 확정값을 못 박은 구간이라
     * 배치 재계산 결과로 덮지 않는다.
     */
    private static boolean is2026H1Seeded(int year, int month) {
        return year == 2026 && month >= 1 && month <= 5;
    }
}
