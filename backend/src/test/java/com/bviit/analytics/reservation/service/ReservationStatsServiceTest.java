package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.repository.ReservationStatsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
