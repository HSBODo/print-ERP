package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationListRepositoryTest {

    @Mock
    private NamedParameterJdbcTemplate warehouseJdbc;

    @Test
    void warehouse_jdbc_와_postgres_sql_두_개를_쓴다() {
        when(warehouseJdbc.queryForList(any(String.class), any(MapSqlParameterSource.class))).thenReturn(List.of());
        ReservationListRepository repo = new ReservationListRepository(warehouseJdbc);

        repo.findReservationList("2026-06-01", "2026-06-23");
        repo.findReservationListAll("2026-06-01", "2026-06-23");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(warehouseJdbc, times(2)).queryForList(sqlCaptor.capture(), any(MapSqlParameterSource.class));

        assertThat(sqlCaptor.getAllValues().get(0))
                .isEqualTo(SqlLoader.load(ReservationListRepository.SQL));
        assertThat(sqlCaptor.getAllValues().get(1))
                .isEqualTo(SqlLoader.load(ReservationListRepository.SQL_ALL));
    }
}
