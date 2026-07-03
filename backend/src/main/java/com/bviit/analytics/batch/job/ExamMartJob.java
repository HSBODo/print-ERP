package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.WatermarkRepository;
import com.bviit.analytics.exam.dto.ExaminationMonthlyItem;
import com.bviit.analytics.exam.dto.ProcedureExamMonthlyItem;
import com.bviit.analytics.exam.service.CataractExamListService;
import com.bviit.analytics.exam.service.ExamListService;
import com.bviit.analytics.exam.service.ExaminationStatsService;
import com.bviit.analytics.exam.service.ProcedureExamStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * 검사 도메인 마트 적재 잡.
 *
 * 네 개의 마트를 채운다:
 *   - mart_examination_monthly     — 범위에 걸친 각 (yr,mo) upsert
 *   - mart_procedure_exam_monthly  — 동일하게 (yr,mo) upsert
 *   - list_exam                    — from..to 검사일 범위 delete+insert
 *   - list_cataract_exam           — from..to 검사일 범위 delete+insert
 *
 * MSSQL 소스에서 읽기는 기존 서비스(ExaminationStatsService, ProcedureExamStatsService,
 * ExamListService, CataractExamListService) 재사용.
 * 월별은 각 서비스의 레거시 보정치(2024·2025)가 적용된 값으로 저장됨(현재 UI 값과 일치).
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ExamMartJob {

    static final String MART_NAME = "exam";

    private final ExaminationStatsService examinationStatsService;
    private final ProcedureExamStatsService procedureExamStatsService;
    private final ExamListService examListService;
    private final CataractExamListService cataractExamListService;
    private final ExamMartWriter writer;
    private final WatermarkRepository watermarkRepository;

    /**
     * from..to 범위를 적재한다. 반환값은 upsert/insert된 총 행 수 (관측용).
     */
    public int run(LocalDate from, LocalDate to) {
        log.info("ExamMartJob start: range={}..{}", from, to);

        // 1) Examination monthly upsert
        List<Integer> years = yearsInRange(from, to);
        List<ExaminationMonthlyItem> examinationMonthly =
                examinationStatsService.getMonthlyStats(years).stream()
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int examinationRows = writer.upsertExaminationMonthly(examinationMonthly);

        // 2) Procedure exam monthly upsert
        List<ProcedureExamMonthlyItem> procedureMonthly =
                procedureExamStatsService.getMonthlyStats(years).stream()
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int procedureRows = writer.upsertProcedureExamMonthly(procedureMonthly);

        // 3) List exam delete+insert
        List<Map<String, Object>> examListRows =
                examListService.getExamList(from.toString(), to.toString());
        int examListInserted = writer.replaceListExam(from, to, examListRows);

        // 4) List cataract exam delete+insert
        List<Map<String, Object>> cataractListRows =
                cataractExamListService.getCataractExamList(from.toString(), to.toString());
        int cataractListInserted = writer.replaceListCataractExam(from, to, cataractListRows);

        // 5) Watermark 갱신 (성공 시에만)
        watermarkRepository.upsert(MART_NAME, to);

        int total = examinationRows + procedureRows + examListInserted + cataractListInserted;
        log.info("ExamMartJob done: examination={} procedure={} examList={} cataractList={} total={}",
                examinationRows, procedureRows, examListInserted, cataractListInserted, total);
        return total;
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
}
