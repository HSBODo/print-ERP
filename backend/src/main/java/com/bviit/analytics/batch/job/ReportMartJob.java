package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.WatermarkRepository;
import com.bviit.analytics.exam.service.ExamCountService;
import com.bviit.analytics.report.dto.WeeklyReportItem;
import com.bviit.analytics.report.service.WeeklyReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * 레포트 도메인 마트 적재 잡.
 *
 * 두 마트를 채운다:
 *   - mart_weekly_report       — 주차 레포트 (ISO 8601 연간 주차)
 *   - mart_exam_count_by_class — 고객분류별 검사수 (월 × 내원동기 9계열)
 *
 * 종전에는 두 화면이 MSSQL 에 직접 붙어 SSH 터널·VPN 이 끊기면 503 이 났다. 이 잡이 배치 시간대에
 * 한 번 적재하고 화면은 마트를 읽는다(@Primary 마트 QueryService) — 다른 도메인과 같은 구조.
 *
 * 두 소스 모두 연 단위 집계라 from..to 에 걸친 연도 전체를 다시 계산한다(idempotent upsert).
 *
 * <h2>min-year 가드 (주차 레포트)</h2>
 * mart_weekly_report 는 V55 로 2025 골든 시드를 박아 배치가 덮지 않도록 min-year(2026) 이상만
 * write 한다. 이 방어가 있어야 자동 배치가 MSSQL 없이도 25 값을 유지할 수 있다.
 * mart_exam_count_by_class 는 24·25 에 분류 자체가 없어 min-year 필터 대상 아님.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReportMartJob {

    static final String MART_NAME = "report";

    private final WeeklyReportService weeklyReportService;
    private final ExamCountService examCountService;
    private final ReportMartWriter writer;
    private final WatermarkRepository watermarkRepository;

    /**
     * mart_weekly_report 골든 시드(V55: 2025) 보호용 min-year 가드.
     * 25 이하 연도는 계산해도 upsert 하지 않는다 — 시드값이 담당자 확정값.
     */
    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    /**
     * 트랜잭션: 도메인 단위 all-or-nothing. weekly·by-class upsert + watermark 갱신을 하나로 묶는다.
     * MSSQL 읽기는 별도 datasource라 이 트랜잭션과 무관.
     */
    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("ReportMartJob start: range={}..{}", from, to);
        List<Integer> years = yearsInRange(from, to);

        List<WeeklyReportItem> weekly = weeklyReportService.getWeeklyStats(years).stream()
                .filter(w -> w.getYear() >= minYear)  // V55 seed(2025) 보호
                .toList();
        int weeklyRows = writer.upsertWeekly(weekly);

        int byClassRows = 0;
        for (int year : years) {
            List<Map<String, Object>> rows = examCountService.getExamCountByClassMonthly(
                    LocalDate.of(year, 1, 1).toString(),
                    LocalDate.of(year, 12, 31).toString());
            byClassRows += writer.upsertExamCountByClass(year, rows);
        }

        watermarkRepository.upsert(MART_NAME, to);

        Map<String, Integer> stats = Map.of(
                "mart_weekly_report", weeklyRows,
                "mart_exam_count_by_class", byClassRows
        );
        log.info("ReportMartJob done: {}", stats);
        return stats;
    }

    private static List<Integer> yearsInRange(LocalDate from, LocalDate to) {
        return Stream.iterate(from.getYear(), y -> y <= to.getYear(), y -> y + 1)
                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
    }
}
