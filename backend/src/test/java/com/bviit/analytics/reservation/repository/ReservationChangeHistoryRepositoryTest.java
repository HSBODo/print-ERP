package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class ReservationChangeHistoryRepositoryTest {

    @Mock
    private NamedParameterJdbcTemplate statsJdbc;

    @Mock
    private NamedParameterJdbcTemplate warehouseJdbc;

    @Test
    void 기본은_stats_jdbc_와_mssql_sql_을_쓴다() {
        ReservationChangeHistoryRepository repo =
                new ReservationChangeHistoryRepository(statsJdbc, warehouseJdbc, false);

        int count = repo.forEachReservation("2026-01-01", "2026-01-31", source -> {});

        assertThat(count).isEqualTo(0);
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> paramsCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(statsJdbc).query(sqlCaptor.capture(), paramsCaptor.capture(), any(RowCallbackHandler.class));
        verifyNoInteractions(warehouseJdbc);

        assertThat(sqlCaptor.getValue())
                .isEqualTo(SqlLoader.load(ReservationChangeHistoryRepository.SQL_MSSQL));
        assertThat(paramsCaptor.getValue().getValue("from")).isEqualTo("2026-01-01");
        assertThat(paramsCaptor.getValue().getValue("to")).isEqualTo("2026-01-31");
    }

    @Test
    void data_platform_켜지면_warehouse_jdbc_와_postgres_sql_을_쓴다() {
        ReservationChangeHistoryRepository repo =
                new ReservationChangeHistoryRepository(statsJdbc, warehouseJdbc, true);

        int count = repo.forEachReservation("2026-01-01", "2026-01-31", source -> {});

        assertThat(count).isEqualTo(0);
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(warehouseJdbc).query(sqlCaptor.capture(), any(MapSqlParameterSource.class), any(RowCallbackHandler.class));
        verifyNoInteractions(statsJdbc);

        assertThat(sqlCaptor.getValue())
                .isEqualTo(SqlLoader.load(ReservationChangeHistoryRepository.SQL_WAREHOUSE));
    }
}
