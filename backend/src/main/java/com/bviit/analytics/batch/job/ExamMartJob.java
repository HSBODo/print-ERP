package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import com.bviit.analytics.exam.dto.ExaminationMonthlyItem;
import com.bviit.analytics.exam.dto.ProcedureExamMonthlyItem;
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
import java.util.stream.Stream;

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
        Map<YearMonth, ExamDailyAgg> byMonth = aggregateByMonth(
                examStatsMartRepository.findExamDailyAgg(from.toString(), to.toString()));

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

    /** from..to에 걸친 연도 목록 (오름차순, 중복 제거). */
    private static List<Integer> yearsInRange(LocalDate from, LocalDate to) {
        return Stream.iterate(from.getYear(), y -> y <= to.getYear(), y -> y + 1).toList();
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
