package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.BeforeEach;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationOverallStatsRepositoryTest {

    @Mock
    private NamedParameterJdbcTemplate statsJdbc;

    @Mock
    private NamedParameterJdbcTemplate warehouseJdbc;

    @Test
    void findReservationOverallMonthly는_mssql_sql_리소스와_날짜_파라미터를_사용한다() {
        when(statsJdbc.queryForList(any(String.class), any(MapSqlParameterSource.class))).thenReturn(List.of());
        ReservationOverallStatsRepository repository = new ReservationOverallStatsRepository(statsJdbc, warehouseJdbc, false);

        repository.findReservationOverallMonthly("2026-01-01", "2026-12-31");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> paramsCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(statsJdbc).queryForList(sqlCaptor.capture(), paramsCaptor.capture());

        assertThat(sqlCaptor.getValue()).isEqualTo(SqlLoader.load(ReservationOverallStatsRepository.MONTHLY_SQL_MSSQL));
        assertThat(paramsCaptor.getValue().getValue("from")).isEqualTo("2026-01-01");
        assertThat(paramsCaptor.getValue().getValue("to")).isEqualTo("2026-12-31");
    }

    @Test
    void findReservationOverallMonthly는_data_platform_활성시_warehouse_경로를_사용한다() {
        when(warehouseJdbc.queryForList(any(String.class), any(MapSqlParameterSource.class))).thenReturn(List.of());
        ReservationOverallStatsRepository repository = new ReservationOverallStatsRepository(statsJdbc, warehouseJdbc, true);

        repository.findReservationOverallMonthly("2026-01-01", "2026-12-31");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(warehouseJdbc).queryForList(sqlCaptor.capture(), any(MapSqlParameterSource.class));

        assertThat(sqlCaptor.getValue()).isEqualTo(SqlLoader.load(ReservationOverallStatsRepository.MONTHLY_SQL_WAREHOUSE));
    }
}
