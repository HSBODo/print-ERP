package com.bviit.analytics.reservation.service;

import com.bviit.analytics.common.exception.DataSourceUnavailableException;
import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDiagnosticsHealthResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsParityResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsResult;
import com.bviit.analytics.reservation.repository.ReservationStatsSystemMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 예약통계_시력교정 조회 진입점. postgres-mart 프로파일 전용 — 배치가 채운 마트가 유일한 진실.
 * 셀 손보정은 reservation_stats_override 로 INSERT-only. 진단(diff/drill-down/parity)만 MSSQL 서비스 의존.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationStatsSystemQueryService {

    private static final String STATS_TYPE = "system";
    private static final String FORMULA_VERSION = "reservation-stats-system-v1";
    /** 응답 메타의 schema 버전 — 종전 ReservationStatsSnapshot.CURRENT_SCHEMA_VERSION 대체. */
    private static final int SCHEMA_VERSION = 1;

    private final ReservationStatsSystemMartRepository martRepository;
    private final ReservationStatsOverrideCellEditService martCellEditService;
    private final Optional<ReservationStatsDiagnosticDiffService> diagnosticService;

    public ReservationStatsResult<List<ReservationStatsDailyRow>> getDailyCounts(
            LocalDate from,
            LocalDate to,
            String username
    ) {
        String period = from.toString().substring(0, 7);
        List<ReservationStatsDailyRow> days = martRepository.findDailyCounts(from.toString(), to.toString());
        return new ReservationStatsResult<>(days, martMeta(period));
    }

    public ReservationStatsDailyRow editCell(
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
                false,                                    // liveServiceAvailable — 이관 후 무의미
                diagnosticService.isPresent(),
                false,                                    // snapshotExists — 스냅샷 파일 폐기
                false,                                    // snapshotLocked
                SCHEMA_VERSION,
                0,                                        // dayCount — 마트 조회는 range 기반이라 미표기
                null,                                     // latestDate
                null,                                     // confirmedAt
                null,                                     // confirmedBy
                FORMULA_VERSION,
                LocalDateTime.now().toString()
        );
    }

    private ReservationStatsDiagnosticDiffService requireDiagnosticService(String period) {
        return diagnosticService.orElseThrow(() -> new DataSourceUnavailableException(
                "진단용 MSSQL 소스가 연결되지 않았습니다.",
                StatsResponseMeta.unavailable(
                        period,
                        FORMULA_VERSION,
                        SCHEMA_VERSION
                )
        ));
    }

    private static StatsResponseMeta martMeta(String period) {
        return StatsResponseMeta.mart(
                period,
                FORMULA_VERSION,
                SCHEMA_VERSION
        );
    }
}
