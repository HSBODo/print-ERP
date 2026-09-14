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
class ReservationListRepositoryTest {

    @Mock
    private NamedParameterJdbcTemplate jdbc;

    private ReservationListRepository repository;

    @BeforeEach
    void setUp() {
        repository = new ReservationListRepository(jdbc);
    }

    @Test
    void findReservationList는_sql_리소스와_날짜_파라미터를_사용한다() {
        when(jdbc.queryForList(any(String.class), any(MapSqlParameterSource.class))).thenReturn(List.of());

        repository.findReservationList("2026-06-01", "2026-06-23");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> paramsCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbc).queryForList(sqlCaptor.capture(), paramsCaptor.capture());

        assertThat(sqlCaptor.getValue()).isEqualTo(SqlLoader.load(ReservationListRepository.RESERVATION_LIST_SQL));
        assertThat(paramsCaptor.getValue().getValue("from")).isEqualTo("2026-06-01");
        assertThat(paramsCaptor.getValue().getValue("to")).isEqualTo("2026-06-23");
    }
}
