package com.bviit.analytics.surgery.repository;

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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReoperationCandidateRepositoryTest {

    @Mock
    private NamedParameterJdbcTemplate statsJdbc;

    @Mock
    private NamedParameterJdbcTemplate warehouseJdbc;

    @Test
    void 기본은_stats_jdbc_와_mssql_sql_을_쓴다() {
        when(statsJdbc.queryForList(any(String.class), any(MapSqlParameterSource.class))).thenReturn(List.of());
        ReoperationCandidateRepository repo =
                new ReoperationCandidateRepository(statsJdbc, warehouseJdbc, false);

        repo.findCandidates("2026-08-01", "2026-08-31");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(statsJdbc).queryForList(sqlCaptor.capture(), any(MapSqlParameterSource.class));
        verifyNoInteractions(warehouseJdbc);

        assertThat(sqlCaptor.getValue())
                .isEqualTo(SqlLoader.load(ReoperationCandidateRepository.SQL_MSSQL));
    }

    @Test
    void data_platform_켜지면_warehouse_jdbc_와_postgres_sql_을_쓴다() {
        when(warehouseJdbc.queryForList(any(String.class), any(MapSqlParameterSource.class))).thenReturn(List.of());
        ReoperationCandidateRepository repo =
                new ReoperationCandidateRepository(statsJdbc, warehouseJdbc, true);

        repo.findCandidates("2026-08-01", "2026-08-31");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(warehouseJdbc).queryForList(sqlCaptor.capture(), any(MapSqlParameterSource.class));
        verifyNoInteractions(statsJdbc);

        assertThat(sqlCaptor.getValue())
                .isEqualTo(SqlLoader.load(ReoperationCandidateRepository.SQL_WAREHOUSE));
    }
}
