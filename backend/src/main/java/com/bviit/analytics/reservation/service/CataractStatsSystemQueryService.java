package com.bviit.analytics.reservation.service;

import com.bviit.analytics.common.exception.DataSourceUnavailableException;
import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.CataractStatsSnapshot;
import com.bviit.analytics.reservation.dto.ReservationStatsDiagnosticsHealthResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsParityResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsResult;
import com.bviit.analytics.reservation.repository.CataractStatsSystemMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 예약통계_백내장 조회 진입점. postgres-mart 프로파일 전용.
 * 시력교정과 동일 구조 — 마트 조회 + override 오버레이 + 진단 브릿지.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class CataractStatsSystemQueryService {

    private static final String STATS_TYPE = "cataract";
    private static final String FORMULA_VERSION = "reservation-stats-cataract-v1";

    private final CataractStatsSystemMartRepository martRepository;
    private final CataractStatsOverrideCellEditService martCellEditService;
    private final Optional<CataractStatsDiagnosticDiffService> diagnosticService;

    public ReservationStatsResult<List<CataractStatsDailyRow>> getDailyCounts(
            LocalDate from,
            LocalDate to,
            String username
    ) {
        String period = from.toString().substring(0, 7);
        List<CataractStatsDailyRow> days = martRepository.findDailyCounts(from.toString(), to.toString());
        return new ReservationStatsResult<>(days, martMeta(period));
    }

    public CataractStatsDailyRow editCell(
            String period,
            String date,
            String field,
            int value,
            String username
    ) {
        return martCellEditService.editCell(period, date, field, value, ReservationStatsQuerySupport.actor(username));
    }

    public ReservationStatsDiffResponse diff(String period) {
        return requireDiagnosticService(period).diff(period);
    }

    public ReservationStatsDrillDownResponse drillDown(String period, String date, String field) {
        return requireDiagnosticService(period).drillDown(period, date, field);
    }

    public ReservationStatsParityResponse parity(String period, String field) {
        return requireDiagnosticService(period).parity(period, field);
    }

    public ReservationStatsDiagnosticsHealthResponse health(String period) {
        return new ReservationStatsDiagnosticsHealthResponse(
                period,
                STATS_TYPE,
                StatsResponseMeta.Source.MART,
                false,
                diagnosticService.isPresent(),
                false,
                false,
                CataractStatsSnapshot.CURRENT_SCHEMA_VERSION,
                0,
                null,
                null,
                null,
                FORMULA_VERSION,
                LocalDateTime.now().toString()
        );
    }

    private CataractStatsDiagnosticDiffService requireDiagnosticService(String period) {
        return diagnosticService.orElseThrow(() -> new DataSourceUnavailableException(
                "진단용 MSSQL 소스가 연결되지 않았습니다.",
                StatsResponseMeta.unavailable(
                        period,
                        FORMULA_VERSION,
                        CataractStatsSnapshot.CURRENT_SCHEMA_VERSION
                )
        ));
    }

    private static StatsResponseMeta martMeta(String period) {
        return StatsResponseMeta.mart(
                period,
                FORMULA_VERSION,
                CataractStatsSnapshot.CURRENT_SCHEMA_VERSION
        );
    }
}
