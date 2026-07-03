package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.WatermarkRepository;
import com.bviit.analytics.etc.dto.B2bRevenueMonthlyItem;
import com.bviit.analytics.etc.service.B2bRevenueStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Stream;

/**
 * 기타 도메인 마트 적재 잡. 현재는 B2B 매출만.
 * 서비스가 반환하는 12×N 월별을 그대로 upsert (기간 겹치는 (yr,mo)만).
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class EtcMartJob {

    static final String MART_NAME = "etc";

    private final B2bRevenueStatsService b2bRevenueStatsService;
    private final EtcMartWriter writer;
    private final WatermarkRepository watermarkRepository;

    public int run(LocalDate from, LocalDate to) {
        log.info("EtcMartJob start: range={}..{}", from, to);
        List<Integer> years = yearsInRange(from, to);

        List<B2bRevenueMonthlyItem> monthly =
                b2bRevenueStatsService.getMonthlyRevenue(years).stream()
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int rows = writer.upsertB2bRevenueMonthly(monthly);

        watermarkRepository.upsert(MART_NAME, to);

        log.info("EtcMartJob done: b2bRevenue={}", rows);
        return rows;
    }

    private static List<Integer> yearsInRange(LocalDate from, LocalDate to) {
        return Stream.iterate(from.getYear(), y -> y <= to.getYear(), y -> y + 1).toList();
    }

    private static boolean isMonthInRange(int year, int month, LocalDate from, LocalDate to) {
        YearMonth ym = YearMonth.of(year, month);
        YearMonth ymFrom = YearMonth.from(from);
        YearMonth ymTo = YearMonth.from(to);
        return !ym.isBefore(ymFrom) && !ym.isAfter(ymTo);
    }
}
