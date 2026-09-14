package com.bviit.analytics.reservation.service;

import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDiagnosticsHealthResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsResult;
import com.bviit.analytics.reservation.repository.CataractStatsSystemMartRepository;
import com.bviit.analytics.reservation.repository.ReservationStatsSystemMartRepository;
import com.bviit.analytics.testsupport.ReservationDailyRowBuilder;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * postgres-mart 프로파일 이후 QueryService 는 Mart-only. 스냅샷/라이브 폴백은 제거됨.
 */
@ExtendWith(MockitoExtension.class)
class ReservationStatsSystemQueryServiceTest {

    @Mock
    private ReservationStatsSystemMartRepository systemMartRepository;

    @Mock
    private ReservationStatsOverrideCellEditService systemMartCellEditService;

    @Mock
    private CataractStatsSystemMartRepository cataractMartRepository;

    @Mock
    private CataractStatsOverrideCellEditService cataractMartCellEditService;

    @Test
    void 시력교정_getDailyCounts는_마트에서_읽고_MART_출처메타를_반환한다() {
        ReservationStatsSystemQueryService service = new ReservationStatsSystemQueryService(
                systemMartRepository,
                systemMartCellEditService,
                Optional.empty()
        );
        List<ReservationStatsDailyRow> rows = List.of(
                ReservationDailyRowBuilder.row("2026-05-01").inboundCall(3).build()
        );
        when(systemMartRepository.findDailyCounts("2026-05-01", "2026-05-31")).thenReturn(rows);

        ReservationStatsResult<List<ReservationStatsDailyRow>> result = service.getDailyCounts(
                LocalDate.parse("2026-05-01"),
                LocalDate.parse("2026-05-31"),
                "viewer"
        );

        assertThat(result.data()).isEqualTo(rows);
        StatsResponseMeta meta = (StatsResponseMeta) result.meta();
        assertThat(meta.source()).isEqualTo(StatsResponseMeta.Source.MART);
        assertThat(meta.period()).isEqualTo("2026-05");
    }

    @Test
    void 시력교정_health는_MART_출처와_진단서비스_상태를_반환한다() {
        ReservationStatsSystemQueryService service = new ReservationStatsSystemQueryService(
                systemMartRepository,
                systemMartCellEditService,
                Optional.empty()
        );

        ReservationStatsDiagnosticsHealthResponse response = service.health("2026-05");

        assertThat(response.statsType()).isEqualTo("system");
        assertThat(response.currentSource()).isEqualTo(StatsResponseMeta.Source.MART);
        assertThat(response.diagnosticServiceAvailable()).isFalse();
        assertThat(response.snapshotExists()).isFalse();
    }

    @Test
    void 백내장_getDailyCounts_도_MART_출처메타를_반환한다() {
        CataractStatsSystemQueryService service = new CataractStatsSystemQueryService(
                cataractMartRepository,
                cataractMartCellEditService,
                Optional.empty()
        );
        List<CataractStatsDailyRow> rows = List.of();
        when(cataractMartRepository.findDailyCounts("2026-05-01", "2026-05-31")).thenReturn(rows);

        ReservationStatsResult<List<CataractStatsDailyRow>> result = service.getDailyCounts(
                LocalDate.parse("2026-05-01"),
                LocalDate.parse("2026-05-31"),
                "viewer"
        );

        assertThat(result.data()).isEqualTo(rows);
        assertThat(((StatsResponseMeta) result.meta()).source()).isEqualTo(StatsResponseMeta.Source.MART);
    }
}
