package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.CataractStatsSnapshot;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsParityResponse;
import com.bviit.analytics.reservation.repository.CataractStatsSystemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class CataractStatsDiagnosticDiffService {

    private final CataractStatsSystemRepository repository;
    private final CataractStatsSnapshotStore snapshotStore;

    @Transactional(readOnly = true)
    public ReservationStatsDiffResponse diff(String period) {
        return ReservationStatsDiagnosticSupport.diff(
                period,
                () -> snapshotStore.find(period).map(CataractStatsSnapshot::days),
                repository::findDailyCounts,
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
                () -> snapshotStore.find(period).map(CataractStatsSnapshot::days),
                CataractStatsDailyRow::date,
                ReservationStatsFieldRegistry.CATARACT_FIELDS,
                repository::findDrillDownRows
        );
    }

    @Transactional(readOnly = true)
    public ReservationStatsParityResponse parity(String period, String field) {
        return ReservationStatsDiagnosticSupport.parity(
                period,
                field,
                repository::findDailyCounts,
                CataractStatsDailyRow::date,
                ReservationStatsFieldRegistry.CATARACT_FIELDS,
                repository::findDrillDownRows
        );
    }
}
