package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.WatermarkRepository;
import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;
import com.bviit.analytics.outpatient.service.OutpatientCountStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * 외래 도메인 마트 적재 잡.
 *
 * mart_outpatient_count_monthly 만 채운다 (도메인이 단일 메트릭).
 * 서비스가 반환하는 MSSQL 라이브값(2026+)을 upsert. 24·25 확정값은 V9 seed가 mart에 넣은 값을
 * 유일 원천으로 유지하며, runManual로 24·25 범위를 실행해도 min-year 이상 연도만 write.
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

    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    /**
     * 트랜잭션: 도메인 단위 all-or-nothing. monthly upsert + watermark 갱신을 하나로 묶어
     * 부분 커밋을 방지. MSSQL 읽기는 별도 datasource이므로 이 트랜잭션과 무관.
     */
    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("OutpatientMartJob start: range={}..{}", from, to);
        List<Integer> years = yearsInRange(from, to);

        // min-year 미만 연도는 V9 seed 값 보존 (write 차단)
        List<OutpatientCountMonthlyItem> monthly =
                outpatientCountStatsService.getMonthlyStats(years).stream()
                        .filter(m -> m.getYear() >= minYear)
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int rows = writer.upsertMonthly(monthly);

        watermarkRepository.upsert(MART_NAME, to);

        Map<String, Integer> stats = Map.of("mart_outpatient_count_monthly", rows);
        log.info("OutpatientMartJob done: {}", stats);
        return stats;
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
