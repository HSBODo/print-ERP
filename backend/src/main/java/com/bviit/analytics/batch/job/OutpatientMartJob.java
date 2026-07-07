package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.WatermarkRepository;
import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;
import com.bviit.analytics.outpatient.service.OutpatientCountStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Stream;

/**
 * 외래 도메인 마트 적재 잡.
 *
 * mart_outpatient_count_monthly 만 채운다 (도메인이 단일 메트릭).
 * 서비스가 반환하는 값(레거시 확정치 2024·2025 + 라이브 2026+ or null)을 그대로 upsert.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OutpatientMartJob {

    static final String MART_NAME = "outpatient";

    private final OutpatientCountStatsService outpatientCountStatsService;
    private final OutpatientMartWriter writer;
    private final WatermarkRepository watermarkRepository;

    /**
     * 트랜잭션: 도메인 단위 all-or-nothing. monthly upsert + watermark 갱신을 하나로 묶어
     * 부분 커밋을 방지. MSSQL 읽기는 별도 datasource이므로 이 트랜잭션과 무관.
     */
    @Transactional
    public int run(LocalDate from, LocalDate to) {
        log.info("OutpatientMartJob start: range={}..{}", from, to);
        List<Integer> years = yearsInRange(from, to);

        List<OutpatientCountMonthlyItem> monthly =
                outpatientCountStatsService.getMonthlyStats(years).stream()
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int rows = writer.upsertMonthly(monthly);

        watermarkRepository.upsert(MART_NAME, to);

        log.info("OutpatientMartJob done: rows={}", rows);
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
