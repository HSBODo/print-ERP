package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.dto.ReservationStatsResponse;
import com.bviit.analytics.reservation.repository.ReservationStatsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationStatsServiceTest {

    @Mock
    private ReservationStatsRepository repository;

    @InjectMocks
    private ReservationStatsService service;

    @Test
    void getStatsCalculatesSummaryRatesAndLabels() {
        when(repository.findSummary("2026-04-01", "2026-04-03")).thenReturn(row(
                "totalReservations", 20,
                "completedExaminations", 10,
                "cancellations", 4,
                "walkInReservations", 5
        ));
        when(repository.findPrevSummary("2026-03-29", "2026-03-31")).thenReturn(row(
                "totalReservations", 10
        ));
        when(repository.findDailyTrend("2026-04-01", "2026-04-03")).thenReturn(List.of(
                row("date", "2026-04-01", "reservations", 7, "examinations", 3, "cancellations", 1)
        ));
        when(repository.findSourceBreakdown("2026-04-01", "2026-04-03")).thenReturn(List.of(
                row("source", "naver", "count", 6)
        ));
        when(repository.findHourlyDistribution("2026-04-01", "2026-04-03")).thenReturn(List.of(
                row("slot", "09:00", "count", 2)
        ));

        ReservationStatsResponse response = service.getStats(LocalDate.of(2026, 4, 1), LocalDate.of(2026, 4, 3));

        assertThat(response.getMeta().getFrom()).isEqualTo("2026-04-01");
        assertThat(response.getMeta().getTo()).isEqualTo("2026-04-03");
        assertThat(response.getData().getSummary().getReservationChangeRate()).isEqualTo(100.0);
        assertThat(response.getData().getSummary().getExaminationConversionRate()).isEqualTo(50.0);
        assertThat(response.getData().getSummary().getCancellationRate()).isEqualTo(20.0);
        assertThat(response.getData().getSummary().getWalkInShareRate()).isEqualTo(25.0);
        assertThat(response.getData().getSourceBreakdown())
                .extracting(ReservationStatsResponse.SourceBreakdown::getLabel)
                .containsExactly("네이버");
    }

    @Test
    void getMonthlyStatsFillsMissingMonthsWithinRequestedYears() {
        when(repository.findMonthlyByType(List.of(2025, 2026))).thenReturn(List.of(
                row("yr", 2025, "mo", 2, "surgery", 3, "outpatient", 4, "dreamlens", 1),
                row("yr", 2026, "mo", 12, "surgery", 1, "outpatient", 2, "dreamlens", 3)
        ));

        List<ReservationMonthlyItem> items = service.getMonthlyStats(List.of(2025, 2026));

        assertThat(items).hasSize(24);
        assertThat(items.get(0).getYear()).isEqualTo(2025);
        assertThat(items.get(0).getMonth()).isEqualTo(1);
        assertThat(items.get(0).getTotal()).isZero();
        assertThat(items.get(1).getMonth()).isEqualTo(2);
        assertThat(items.get(1).getTotal()).isEqualTo(8);
        assertThat(items.get(23).getYear()).isEqualTo(2026);
        assertThat(items.get(23).getMonth()).isEqualTo(12);
        assertThat(items.get(23).getTotal()).isEqualTo(6);
    }

    private Map<String, Object> row(Object... values) {
        Map<String, Object> row = new HashMap<>();
        for (int index = 0; index < values.length; index += 2) {
            row.put(String.valueOf(values[index]), values[index + 1]);
        }
        return row;
    }
}
