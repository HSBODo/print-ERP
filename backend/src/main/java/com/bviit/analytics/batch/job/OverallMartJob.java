package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.WatermarkRepository;
import com.bviit.analytics.overall.dto.OverallExamMonthlyItem;
import com.bviit.analytics.overall.dto.OverallExamWeeklyItem;
import com.bviit.analytics.overall.service.OverallExamMonthlyService;
import com.bviit.analytics.overall.service.OverallExamWeeklyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Stream;

/**
 * 전체지표 도메인 마트 적재 잡.
 *
 * mart_overall_exam_weekly + mart_overall_exam_monthly 를 함께 채운다.
 * 서비스는 요청 연도의 전 기간 일자별 데이터를 읽어 주 단위로 버킷팅하고, 월별은 그 주별을 롤업한다.
 * 서비스가 데이터가 있는 주만 반환 → 빈 미래 주/월은 마트에 저장 안 됨.
 *
 * 24·25 는 프론트 하드코딩(레거시)이 유일한 진실이라 마트에 시드하지 않으며, min-year 가드로
 * 배치가 24·25 를 write 하지 못하도록 차단한다(runManual 로 과거 범위를 지정해도 무시).
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OverallMartJob {

    static final String MART_NAME = "overall";

    private final OverallExamWeeklyService overallExamWeeklyService;
    private final OverallExamMonthlyService overallExamMonthlyService;
    private final OverallMartWriter writer;
    private final WatermarkRepository watermarkRepository;

    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    /**
     * 트랜잭션: 도메인 단위 all-or-nothing. weekly·monthly upsert + watermark 갱신을 하나로 묶어
     * 부분 커밋을 방지. MSSQL 읽기는 별도 datasource이므로 이 트랜잭션과 무관.
     */
    @Transactional
    public int run(LocalDate from, LocalDate to) {
        log.info("OverallMartJob start: range={}..{}", from, to);
        List<Integer> years = yearsInRange(from, to);

        List<OverallExamWeeklyItem> weekly = overallExamWeeklyService.getWeeklyStats(years);
        int weeklyRows = writer.upsertWeekly(weekly);

        List<OverallExamMonthlyItem> monthly = overallExamMonthlyService.getMonthlyStats(years).stream()
                .filter(m -> m.getYear() >= minYear)
                .toList();
        int monthlyRows = writer.upsertMonthly(monthly);

        watermarkRepository.upsert(MART_NAME, to);

        int total = weeklyRows + monthlyRows;
        log.info("OverallMartJob done: weekly={}, monthly={}", weeklyRows, monthlyRows);
        return total;
    }

    private static List<Integer> yearsInRange(LocalDate from, LocalDate to) {
        return Stream.iterate(from.getYear(), y -> y <= to.getYear(), y -> y + 1).toList();
    }
}
