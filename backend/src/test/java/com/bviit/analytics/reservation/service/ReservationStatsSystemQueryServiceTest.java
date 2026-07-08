package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.CataractStatsSnapshot;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDiagnosticsHealthResponse;
import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.reservation.dto.ReservationStatsResult;
import com.bviit.analytics.reservation.dto.ReservationStatsSnapshot;
import com.bviit.analytics.common.exception.DataSourceUnavailableException;
import com.bviit.analytics.testsupport.CataractDailyRowBuilder;
import com.bviit.analytics.testsupport.ReservationDailyRowBuilder;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationStatsSystemQueryServiceTest {

    @Mock
    private ReservationStatsSnapshotStore reservationStore;

    @Mock
    private ReservationStatsCellEditService reservationCellEditService;

    @Mock
    private ReservationStatsSystemService reservationLiveService;

    @Mock
    private ReservationStatsDiagnosticDiffService reservationDiagnosticService;

    @Mock
    private CataractStatsSnapshotStore cataractStore;

    @Mock
    private CataractStatsCellEditService cataractCellEditService;

    @Mock
    private CataractStatsSystemService cataractLiveService;

    @Mock
    private CataractStatsDiagnosticDiffService cataractDiagnosticService;

    @Test
    void 시력교정_조회는_스냅샷이_있으면_라이브_없이_필터링해서_반환한다() {
        ReservationStatsSnapshot snapshot = new ReservationStatsSnapshot(
                "2026-05",
                "2026-06-24T10:00:00",
                "tester",
                true,
                List.of(systemRow("2026-05-01", 1), systemRow("2026-05-02", 2))
        );
        ReservationStatsSystemQueryService service = new ReservationStatsSystemQueryService(
                reservationStore,
                reservationCellEditService,
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty()
        );
        when(reservationStore.find("2026-05")).thenReturn(Optional.of(snapshot));

        ReservationStatsResult<List<ReservationStatsDailyRow>> result = service.getDailyCounts(
                LocalDate.parse("2026-05-02"),
                LocalDate.parse("2026-05-02"),
                "viewer"
        );

        assertThat(result.data()).containsExactly(systemRow("2026-05-02", 2));
        StatsResponseMeta meta = (StatsResponseMeta) result.meta();
        assertThat(meta.source()).isEqualTo(StatsResponseMeta.Source.SNAPSHOT);
        assertThat(meta.locked()).isTrue();
        assertThat(meta.schemaVersion()).isEqualTo(ReservationStatsSnapshot.CURRENT_SCHEMA_VERSION);
        verifyNoInteractions(reservationLiveService);
    }

    @Test
    void 시력교정_당월_스냅샷이_없으면_라이브폴백_없이_빈결과를_반환한다() {
        // 월초(마감된 D-1 없음)엔 오늘을 라이브로 노출하지 않고 빈 표를 준다. (내일 D-1로 적재되어 등장)
        ReservationStatsSystemQueryService service = new ReservationStatsSystemQueryService(
                reservationStore,
                reservationCellEditService,
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty()
        );
        String currentMonth = YearMonth.now().toString();
        LocalDate first = LocalDate.parse(currentMonth + "-01");
        when(reservationStore.find(currentMonth)).thenReturn(Optional.empty());

        ReservationStatsResult<List<ReservationStatsDailyRow>> result =
                service.getDailyCounts(first, first, "viewer");

        assertThat(result.data()).isEmpty();
        assertThat(((StatsResponseMeta) result.meta()).source()).isEqualTo(StatsResponseMeta.Source.LIVE);
        verifyNoInteractions(reservationLiveService);
    }

    @Test
    void 시력교정_조회는_스냅샷과_라이브가_모두_없으면_출처_메타가_있는_503_예외를_던진다() {
        ReservationStatsSystemQueryService service = new ReservationStatsSystemQueryService(
                reservationStore,
                reservationCellEditService,
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty()
        );
        when(reservationStore.find("2026-05")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getDailyCounts(
                LocalDate.parse("2026-05-01"),
                LocalDate.parse("2026-05-02"),
                "viewer"
        ))
                .isInstanceOf(DataSourceUnavailableException.class)
                .satisfies(error -> {
                    StatsResponseMeta meta =
                            (StatsResponseMeta) ((DataSourceUnavailableException) error).getMeta();
                    assertThat(meta.source()).isEqualTo(StatsResponseMeta.Source.UNAVAILABLE);
                    assertThat(meta.period()).isEqualTo("2026-05");
                });
    }

    @Test
    void 시력교정_health는_스냅샷과_서비스_상태를_가볍게_반환한다() {
        ReservationStatsSnapshot snapshot = new ReservationStatsSnapshot(
                "2026-05",
                "2026-06-24T10:00:00",
                "tester",
                true,
                List.of(systemRow("2026-05-01", 1), systemRow("2026-05-03", 3))
        );
        ReservationStatsSystemQueryService service = new ReservationStatsSystemQueryService(
                reservationStore,
                reservationCellEditService,
                Optional.of(reservationLiveService),
                Optional.of(reservationDiagnosticService),
                Optional.empty(),
                Optional.empty()
        );
        when(reservationStore.find("2026-05")).thenReturn(Optional.of(snapshot));

        ReservationStatsDiagnosticsHealthResponse response = service.health("2026-05");

        assertThat(response.statsType()).isEqualTo("system");
        assertThat(response.currentSource()).isEqualTo(StatsResponseMeta.Source.SNAPSHOT);
        assertThat(response.liveServiceAvailable()).isTrue();
        assertThat(response.diagnosticServiceAvailable()).isTrue();
        assertThat(response.snapshotExists()).isTrue();
        assertThat(response.snapshotLocked()).isTrue();
        assertThat(response.dayCount()).isEqualTo(2);
        assertThat(response.latestDate()).isEqualTo("2026-05-03");
    }

    @Test
    void 백내장_health는_스냅샷이_없고_라이브가_있으면_LIVE_출처로_표시한다() {
        CataractStatsSystemQueryService service = new CataractStatsSystemQueryService(
                cataractStore,
                cataractCellEditService,
                Optional.of(cataractLiveService),
                Optional.empty(),
                Optional.empty(),
                Optional.empty()
        );
        when(cataractStore.find("2026-05")).thenReturn(Optional.empty());

        ReservationStatsDiagnosticsHealthResponse response = service.health("2026-05");

        assertThat(response.statsType()).isEqualTo("cataract");
        assertThat(response.currentSource()).isEqualTo(StatsResponseMeta.Source.LIVE);
        assertThat(response.liveServiceAvailable()).isTrue();
        assertThat(response.diagnosticServiceAvailable()).isFalse();
        assertThat(response.snapshotExists()).isFalse();
        assertThat(response.schemaVersion()).isEqualTo(CataractStatsSnapshot.CURRENT_SCHEMA_VERSION);
    }

    private static ReservationStatsDailyRow systemRow(String date, int inboundCall) {
        return ReservationDailyRowBuilder.row(date).inboundCall(inboundCall).build();
    }

    @SuppressWarnings("unused")
    private static CataractStatsDailyRow cataractRow(String date, int inboundCall) {
        return CataractDailyRowBuilder.row(date).inboundCall(inboundCall).build();
    }
}
