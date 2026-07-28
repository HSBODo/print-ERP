package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.WatermarkRepository;
import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;
import com.bviit.analytics.outpatient.service.OutpatientCountStatsService;
import com.bviit.analytics.outpatient.service.OutpatientListService;
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
 * 외래 도메인 마트 적재 잡.
 *
 * 두 개의 마트를 채운다:
 *   - mart_outpatient_count_monthly — (yr,mo) upsert (min-year 가드로 24·25 write 차단)
 *   - list_outpatient               — from..to 예약일 범위 delete+insert
 *
 * MSSQL 소스에서 읽기는 기존 서비스(OutpatientCountStatsService, OutpatientListService) 재사용.
 *
 * 24·25 확정값은 V9 seed가 mart에 넣은 값을 유일 원천으로 유지한다.
 * runManual로 24·25 범위를 실행해도 monthly upsert는 min-year 이상 연도만 수행.
 * 리스트(list_outpatient)는 min-year 가드를 따르지 않는다(delete+insert의 특성상 범위 그대로 재적재).
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OutpatientMartJob {

    static final String MART_NAME = "outpatient";

    private final OutpatientCountStatsService outpatientCountStatsService;
    private final OutpatientListService outpatientListService;
    private final OutpatientMartWriter writer;
    private final WatermarkRepository watermarkRepository;

    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    /**
     * 트랜잭션: 도메인 단위 all-or-nothing. monthly upsert + list delete/insert + watermark 갱신을 하나로
     * 묶어 부분 커밋을 방지. MSSQL 읽기는 별도 datasource이므로 이 트랜잭션과 무관.
     */
    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("OutpatientMartJob start: range={}..{}", from, to);
        List<Integer> years = yearsInRange(from, to);

        // 1) mart_outpatient_count_monthly — min-year 미만 연도는 V9 seed 값 보존 (write 차단)
        List<OutpatientCountMonthlyItem> monthly =
                outpatientCountStatsService.getMonthlyStats(years).stream()
                        .filter(m -> m.getYear() >= minYear)
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int monthlyRows = writer.upsertMonthly(monthly);

        // 2) list_outpatient delete+insert (예약일 기준)
        List<Map<String, Object>> outpatientListRows =
                outpatientListService.getOutpatientList(from.toString(), to.toString());
        int listInserted = writer.replaceListOutpatient(from, to, outpatientListRows);

        // 3) Watermark 갱신 (성공 시에만)
        watermarkRepository.upsert(MART_NAME, to);

        Map<String, Integer> stats = new LinkedHashMap<>();
        stats.put("mart_outpatient_count_monthly", monthlyRows);
        stats.put("list_outpatient", listInserted);
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
