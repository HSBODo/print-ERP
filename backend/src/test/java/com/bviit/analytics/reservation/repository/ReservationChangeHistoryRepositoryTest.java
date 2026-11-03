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

@ExtendWith(MockitoExtension.class)
class ReservationChangeHistoryRepositoryTest {

    @Mock
    private NamedParameterJdbcTemplate warehouseJdbc;

    @Test
    void warehouse_jdbc_와_postgres_sql_을_쓴다() {
        ReservationChangeHistoryRepository repo = new ReservationChangeHistoryRepository(warehouseJdbc);

        int count = repo.forEachReservation("2026-01-01", "2026-01-31", source -> {});

        assertThat(count).isEqualTo(0);
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> paramsCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(warehouseJdbc).query(sqlCaptor.capture(), paramsCaptor.capture(), any(RowCallbackHandler.class));

        assertThat(sqlCaptor.getValue())
                .isEqualTo(SqlLoader.load(ReservationChangeHistoryRepository.SQL));
        assertThat(paramsCaptor.getValue().getValue("from")).isEqualTo("2026-01-01");
        assertThat(paramsCaptor.getValue().getValue("to")).isEqualTo("2026-01-31");
    }
}
