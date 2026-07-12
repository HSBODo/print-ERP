package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffItem;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownRow;
import com.bviit.analytics.reservation.dto.ReservationStatsParityItem;
import com.bviit.analytics.reservation.dto.ReservationStatsParityResponse;
import com.bviit.analytics.reservation.repository.CataractStatsSystemMartRepository;
import com.bviit.analytics.reservation.repository.CataractStatsSystemRepository;
import com.bviit.analytics.reservation.repository.ReservationStatsSystemMartRepository;
import com.bviit.analytics.reservation.repository.ReservationStatsSystemRepository;
import com.bviit.analytics.testsupport.CataractDailyRowBuilder;
import com.bviit.analytics.testsupport.ReservationDailyRowBuilder;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Diff/DrillDown/Parity 는 이제 Postgres 마트(override 오버레이 포함) 을 "확정본" 축으로 삼고
 * MSSQL 라이브 재조회를 반대편에 두어 비교한다. 이관 이전 JSON 스냅샷 참조 로직은 제거됨.
 */
@ExtendWith(MockitoExtension.class)
class ReservationStatsDiagnosticDiffServiceTest {

    @Mock
    private ReservationStatsSystemRepository reservationLiveRepository;

    @Mock
    private ReservationStatsSystemMartRepository reservationMartRepository;

    @Mock
    private CataractStatsSystemRepository cataractLiveRepository;

    @Mock
    private CataractStatsSystemMartRepository cataractMartRepository;

    @Test
    void 마트가_비어있으면_라이브를_조회하지_않고_빈_diff를_반환한다() {
        YearMonth period = previousPeriod();
        ReservationStatsDiagnosticDiffService service = newSystemService();
        when(reservationMartRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of());

        ReservationStatsDiffResponse response = service.diff(period.toString());

        assertThat(response.period()).isEqualTo(period.toString());
        assertThat(response.snapshotExists()).isFalse();
        assertThat(response.diffCount()).isZero();
        assertThat(response.diffs()).isEmpty();
        verifyNoInteractions(reservationLiveRepository);
    }

    @Test
    void 값이_다른_numeric_field를_diff로_반환한다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(1).toString();
        ReservationStatsDiagnosticDiffService service = newSystemService();
        when(reservationMartRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(reservationRow(date, 10, 0, 0)));
        when(reservationLiveRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(reservationRow(date, 12, 0, 0)));

        ReservationStatsDiffResponse response = service.diff(period.toString());

        assertThat(response.snapshotExists()).isTrue();
        assertThat(response.diffCount()).isEqualTo(1);
        assertThat(response.diffs()).containsExactly(
                new ReservationStatsDiffItem(date, "inboundCall", "인입콜", 10, 12, 2)
        );
    }

    @Test
    void 라이브에만_있는_날짜는_snapshot_값_null로_비교한다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(2).toString();
        ReservationStatsDiagnosticDiffService service = newSystemService();
        // 마트에도 값이 있어야 loadMartRows 가 Optional.of(...) 를 리턴 (빈 리스트면 short-circuit)
        when(reservationMartRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(reservationRow(period.atDay(1).toString(), 0, 0, 0)));
        when(reservationLiveRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(reservationRow(date, 0, 0, 3)));

        ReservationStatsDiffResponse response = service.diff(period.toString());

        assertThat(response.diffs()).contains(
                new ReservationStatsDiffItem(date, "callReservation", "예약수", null, 3, null)
        );
    }

    @Test
    void 마트에만_있는_날짜는_live_값_null로_비교한다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(3).toString();
        ReservationStatsDiagnosticDiffService service = newSystemService();
        when(reservationMartRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(reservationRow(date, 0, 7, 0)));
        when(reservationLiveRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of());

        ReservationStatsDiffResponse response = service.diff(period.toString());

        assertThat(response.diffs()).containsExactly(
                new ReservationStatsDiffItem(date, "newInquiry", "신규예약 문의", 7, null, null)
        );
    }

    @Test
    void 백내장도_daily_row_numeric_field를_비교한다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(1).toString();
        CataractStatsDiagnosticDiffService service = newCataractService();
        when(cataractMartRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(cataractRow(date, 10, 0)));
        when(cataractLiveRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(cataractRow(date, 12, 0)));

        ReservationStatsDiffResponse response = service.diff(period.toString());

        assertThat(response.diffs()).containsExactly(
                new ReservationStatsDiffItem(date, "totalCataract", "백내장", 10, 12, 2)
        );
        verify(cataractLiveRepository).findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString());
    }

    @Test
    void 시력교정_drill_down은_마트값과_라이브_row_기여도_합계를_함께_반환한다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(1).toString();
        ReservationStatsDiagnosticDiffService service = newSystemService();
        when(reservationMartRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(reservationRow(date, 10, 0, 0)));
        when(reservationLiveRepository.findDrillDownRows(date, "inboundCall"))
                .thenReturn(List.of(
                        drillRow(date, "inboundCall", "CH_01", "인입콜", "EICN:1", 7),
                        drillRow(date, "inboundCall", "CH_01", "인입콜", "EICN:2", 5)
                ));

        ReservationStatsDrillDownResponse response = service.drillDown(period.toString(), date, "inboundCall");

        assertThat(response.snapshotExists()).isTrue();
        assertThat(response.label()).isEqualTo("인입콜");
        assertThat(response.snapshotValue()).isEqualTo(10);
        assertThat(response.liveValue()).isEqualTo(12);
        assertThat(response.delta()).isEqualTo(2);
        assertThat(response.rowCount()).isEqualTo(2);
        assertThat(response.rows()).hasSize(2);
        verify(reservationLiveRepository).findDrillDownRows(date, "inboundCall");
    }

    @Test
    void 시력교정_drill_down은_마트가_비어도_라이브_row를_반환한다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(2).toString();
        ReservationStatsDiagnosticDiffService service = newSystemService();
        when(reservationMartRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of());
        when(reservationLiveRepository.findDrillDownRows(date, "callReservation"))
                .thenReturn(List.of(drillRow(date, "callReservation", "CH_03", "검사_예약", "CALL:1", 1)));

        ReservationStatsDrillDownResponse response = service.drillDown(period.toString(), date, "callReservation");

        assertThat(response.snapshotExists()).isFalse();
        assertThat(response.label()).isEqualTo("예약수");
        assertThat(response.snapshotValue()).isNull();
        assertThat(response.liveValue()).isEqualTo(1);
        assertThat(response.delta()).isNull();
    }

    @Test
    void drill_down은_알수없는_field를_거부한다() {
        YearMonth period = previousPeriod();
        ReservationStatsDiagnosticDiffService service = newSystemService();

        assertThatThrownBy(() -> service.drillDown(period.toString(), period.atDay(1).toString(), "unknownField"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown reservation stats field");

        verifyNoInteractions(reservationMartRepository, reservationLiveRepository);
    }

    @Test
    void drill_down은_period_밖의_날짜를_거부한다() {
        YearMonth period = previousPeriod();
        ReservationStatsDiagnosticDiffService service = newSystemService();

        assertThatThrownBy(() -> service.drillDown(period.toString(), period.plusMonths(1).atDay(1).toString(), "inboundCall"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("date must belong to period");

        verifyNoInteractions(reservationMartRepository, reservationLiveRepository);
    }

    @Test
    void 백내장_drill_down은_0_고정_field도_유효_field로_처리한다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(1).toString();
        CataractStatsDiagnosticDiffService service = newCataractService();
        when(cataractMartRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(cataractRow(date, 0, 0)));

        ReservationStatsDrillDownResponse response = service.drillDown(period.toString(), date, "totalPresbyopia");

        assertThat(response.snapshotValue()).isZero();
        assertThat(response.liveValue()).isZero();
        assertThat(response.delta()).isZero();
        assertThat(response.rows()).isEmpty();
    }

    @Test
    void parity는_daily_집계값과_drill_down_기여도_합계를_일자별로_대조한다() {
        YearMonth period = previousPeriod();
        String date1 = period.atDay(1).toString();
        String date2 = period.atDay(2).toString();
        ReservationStatsDiagnosticDiffService service = newSystemService();
        when(reservationLiveRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(
                        reservationRow(date1, 3, 0, 0),
                        reservationRow(date2, 5, 0, 0)
                ));
        when(reservationLiveRepository.findDrillDownRows(anyString(), eq("inboundCall"))).thenReturn(List.of());
        when(reservationLiveRepository.findDrillDownRows(date1, "inboundCall"))
                .thenReturn(List.of(
                        drillRow(date1, "inboundCall", "CH_01", "인입콜", "EICN:1", 1),
                        drillRow(date1, "inboundCall", "CH_01", "인입콜", "EICN:2", 2)
                ));
        when(reservationLiveRepository.findDrillDownRows(date2, "inboundCall"))
                .thenReturn(List.of(drillRow(date2, "inboundCall", "CH_01", "인입콜", "EICN:3", 4)));

        ReservationStatsParityResponse response = service.parity(period.toString(), "inboundCall");

        assertThat(response.field()).isEqualTo("inboundCall");
        assertThat(response.label()).isEqualTo("인입콜");
        assertThat(response.mismatchCount()).isEqualTo(1);
        assertThat(response.items())
                .filteredOn(item -> item.date().equals(date1))
                .containsExactly(new ReservationStatsParityItem(date1, "inboundCall", "인입콜", 3, 3, 0, 2));
        assertThat(response.items())
                .filteredOn(item -> item.date().equals(date2))
                .containsExactly(new ReservationStatsParityItem(date2, "inboundCall", "인입콜", 5, 4, -1, 1));
    }

    @Test
    void parity는_drill_down_매핑이_없는_0고정_field에서_상세_sql을_호출하지_않는다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(1).toString();
        CataractStatsDiagnosticDiffService service = newCataractService();
        when(cataractLiveRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(cataractRow(date, 0, 0)));

        ReservationStatsParityResponse response = service.parity(period.toString(), "totalPresbyopia");

        assertThat(response.field()).isEqualTo("totalPresbyopia");
        assertThat(response.label()).isEqualTo("노안");
        assertThat(response.mismatchCount()).isZero();
        verify(cataractLiveRepository, never()).findDrillDownRows(anyString(), eq("totalPresbyopia"));
    }

    private ReservationStatsDiagnosticDiffService newSystemService() {
        return new ReservationStatsDiagnosticDiffService(reservationLiveRepository, reservationMartRepository);
    }

    private CataractStatsDiagnosticDiffService newCataractService() {
        return new CataractStatsDiagnosticDiffService(cataractLiveRepository, cataractMartRepository);
    }

    private static YearMonth previousPeriod() {
        return YearMonth.now().minusMonths(1);
    }

    private static ReservationStatsDailyRow reservationRow(
            String date,
            int inboundCall,
            int newInquiry,
            int callReservation
    ) {
        return ReservationDailyRowBuilder.row(date)
                .inboundCall(inboundCall).newInquiry(newInquiry).callReservation(callReservation).build();
    }

    private static CataractStatsDailyRow cataractRow(String date, int totalCataract, int cancel) {
        return CataractDailyRowBuilder.row(date).totalCataract(totalCataract).cancel(cancel).build();
    }

    private static ReservationStatsDrillDownRow drillRow(
            String date,
            String field,
            String source,
            String gb,
            String primaryKey,
            int contribution
    ) {
        return new ReservationStatsDrillDownRow(date, field, source, gb, "", primaryKey, contribution);
    }
}
