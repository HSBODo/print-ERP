package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsParityResponse;
import com.bviit.analytics.reservation.repository.CataractStatsSystemMartRepository;
import com.bviit.analytics.reservation.repository.CataractStatsSystemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

/**
 * 예약통계_백내장 진단. mart vs live MSSQL 비교. 시력교정과 동일 패턴.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class CataractStatsDiagnosticDiffService {

    private final CataractStatsSystemRepository liveRepository;
    private final CataractStatsSystemMartRepository martRepository;

    @Transactional(readOnly = true)
    public ReservationStatsDiffResponse diff(String period) {
        return ReservationStatsDiagnosticSupport.diff(
                period,
                () -> loadMartRows(period),
                liveRepository::findDailyCounts,
                CataractStatsDailyRow::date,
                ReservationStatsFieldRegistry.CATARACT_FIELDS
        );
    }

    @Transactional(readOnly = true)
    public ReservationStatsDrillDownResponse drillDown(String period, String date, String field) {
        return ReservationStatsDiagnosticSupport.drillDown(
                period,
                date,
                field,
                () -> loadMartRows(period),
                CataractStatsDailyRow::date,
                ReservationStatsFieldRegistry.CATARACT_FIELDS,
                liveRepository::findDrillDownRows
        );
    }

    @Transactional(readOnly = true)
    public ReservationStatsParityResponse parity(String period, String field) {
        return ReservationStatsDiagnosticSupport.parity(
                period,
                field,
                liveRepository::findDailyCounts,
                CataractStatsDailyRow::date,
                ReservationStatsFieldRegistry.CATARACT_FIELDS,
                liveRepository::findDrillDownRows
        );
    }

    private Optional<List<CataractStatsDailyRow>> loadMartRows(String period) {
        YearMonth ym = YearMonth.parse(period);
        List<CataractStatsDailyRow> rows = martRepository.findDailyCounts(
                ym.atDay(1).toString(),
                ym.atEndOfMonth().toString()
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows);
    }
}
