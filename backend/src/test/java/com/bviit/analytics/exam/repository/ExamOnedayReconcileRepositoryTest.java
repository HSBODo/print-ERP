package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExamOnedayReconcileRepositoryTest {

    @Mock
    private NamedParameterJdbcTemplate warehouseJdbc;

    @Mock
    private NamedParameterJdbcTemplate martJdbc;

    @Test
    void warehouse_jdbc_로_CRM_읽고_mart_jdbc_는_UPDATE_에_사용() {
        when(warehouseJdbc.query(any(String.class), any(MapSqlParameterSource.class), any(RowMapper.class)))
                .thenReturn(List.of());
        ExamOnedayReconcileRepository repo =
                new ExamOnedayReconcileRepository(warehouseJdbc, martJdbc);

        repo.findLaterReexamCandidates(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(warehouseJdbc).query(sqlCaptor.capture(), any(MapSqlParameterSource.class), any(RowMapper.class));
        verifyNoInteractions(martJdbc);

        assertThat(sqlCaptor.getValue())
                .isEqualTo(SqlLoader.load(ExamOnedayReconcileRepository.SQL));
    }
}
