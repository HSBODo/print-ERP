package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import com.bviit.analytics.etc.dto.B2bRevenueMonthlyItem;
import com.bviit.analytics.etc.service.B2bRevenueStatsService;
import com.bviit.analytics.etc.service.DreamlensLedgerImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * 기타 도메인 마트 적재 잡 — B2B 매출 upsert + 드림렌즈 장부 자동 초안.
 * 서비스가 반환하는 12×N 월별을 그대로 upsert (기간 겹치는 (yr,mo)만).
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class EtcMartJob {

    static final String MART_NAME = "etc";

    private final B2bRevenueStatsService b2bRevenueStatsService;
    private final DreamlensLedgerImportService dreamlensLedgerImportService;
    private final EtcMartWriter writer;
    private final BatchSuccessLogRepository successLogRepository;

    /**
     * 트랜잭션: 도메인 단위 all-or-nothing. b2b-revenue upsert + 성공 로그 갱신을 하나로 묶어
     * 부분 커밋을 방지. MSSQL 읽기는 별도 datasource이므로 이 트랜잭션과 무관.
     *
     * 예외 — 드림렌즈 장부 초안은 링크드서버(.240 IPLUS) 의존이라 REQUIRES_NEW 로 분리 실행하고,
     * 실패해도 B2B 매출 적재는 살린다(원격 서버 장애가 도메인 전체를 넘어뜨리지 않게).
     */
    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("EtcMartJob start: range={}..{}", from, to);
        List<Integer> years = yearsInRange(from, to);

        List<B2bRevenueMonthlyItem> monthly =
                b2bRevenueStatsService.getMonthlyRevenue(years).stream()
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int rows = writer.upsertB2bRevenueMonthly(monthly);

        Map<String, Integer> stats = new HashMap<>();
        stats.put("mart_b2b_revenue_monthly", rows);

        try {
            Map<String, Integer> ledger = dreamlensLedgerImportService.importRange(from, to);
            stats.put("dreamlens_ledger_inserted", ledger.getOrDefault("inserted", 0));
            stats.put("dreamlens_ledger_refreshed", ledger.getOrDefault("refreshed", 0));
        } catch (RuntimeException e) {
            // 링크드서버 장애 등 — 초안만 건너뛰고 배치는 성공 처리. run-logs 대신 여기 남긴다.
            log.error("DreamlensLedgerImport failed (skipped, other etc loads kept): {}", e.getMessage(), e);
            stats.put("dreamlens_ledger_failed", 1);
        }

        successLogRepository.upsert(MART_NAME, to);

        log.info("EtcMartJob done: {}", stats);
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
