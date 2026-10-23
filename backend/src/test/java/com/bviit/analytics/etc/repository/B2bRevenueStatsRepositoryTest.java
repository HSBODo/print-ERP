package com.bviit.analytics.etc.repository;

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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class B2bRevenueStatsRepositoryTest {

    @Mock
    private NamedParameterJdbcTemplate warehouseJdbc;

    private B2bRevenueStatsRepository repository;

    @BeforeEach
    void setUp() {
        repository = new B2bRevenueStatsRepository(warehouseJdbc);
    }

    @Test
    void findMonthlyRevenue는_warehouse_SQL과_연도_범위_파라미터를_사용한다() {
        when(warehouseJdbc.queryForList(anyString(), any(MapSqlParameterSource.class))).thenReturn(List.of());

        repository.findMonthlyRevenue(List.of(2026, 2024));

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> paramsCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(warehouseJdbc).queryForList(sqlCaptor.capture(), paramsCaptor.capture());

        assertThat(paramsCaptor.getValue().getValue("from")).isEqualTo("2024-01-01");
        assertThat(paramsCaptor.getValue().getValue("to")).isEqualTo("2026-12-31");

        String sql = sqlCaptor.getValue();
        assertThat(sql)
                .contains("WITH b2b_rows AS")
                .contains("raw.raw_crm_operationdata")
                .contains("raw.raw_crm_cataract_operationdata")
                .contains("raw.raw_crm_cataract_exam")
                .contains("raw.raw_crm_motive_new01")
                .contains("EXTRACT(YEAR FROM CAST(x.operation_date AS date))")
                .doesNotContain("WITH(NOLOCK)")
                .doesNotContain("ISNULL(")
                .doesNotContain("[Level]");
    }
}
