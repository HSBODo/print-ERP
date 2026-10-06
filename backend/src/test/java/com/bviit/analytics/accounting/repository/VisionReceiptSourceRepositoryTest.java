package com.bviit.analytics.accounting.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VisionReceiptSourceRepositoryTest {

    @Mock
    private NamedParameterJdbcTemplate statsJdbc;

    @Mock
    private NamedParameterJdbcTemplate warehouseJdbc;

    private static final LocalDate FROM = LocalDate.of(2026, 8, 1);
    private static final LocalDate TO = LocalDate.of(2026, 8, 31);

    @Test
    void 기본은_stats_jdbc_와_mssql_sql_4개를_쓴다() {
        when(statsJdbc.queryForList(any(String.class), any(MapSqlParameterSource.class))).thenReturn(List.of());
        VisionReceiptSourceRepository repo =
                new VisionReceiptSourceRepository(statsJdbc, warehouseJdbc, false);

        repo.findPayments(FROM, TO);
        repo.findItemDetails(FROM, TO);
        repo.findItemFallbacks(FROM, TO);
        repo.findOperations(FROM, TO);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(statsJdbc, times(4)).queryForList(sqlCaptor.capture(), any(MapSqlParameterSource.class));
        verifyNoInteractions(warehouseJdbc);

        assertThat(sqlCaptor.getAllValues().get(0)).isEqualTo(SqlLoader.load(VisionReceiptSourceRepository.PAYMENTS_MSSQL));
        assertThat(sqlCaptor.getAllValues().get(1)).isEqualTo(SqlLoader.load(VisionReceiptSourceRepository.ITEM_DETAILS_MSSQL));
        assertThat(sqlCaptor.getAllValues().get(2)).isEqualTo(SqlLoader.load(VisionReceiptSourceRepository.ITEMS_MSSQL));
        assertThat(sqlCaptor.getAllValues().get(3)).isEqualTo(SqlLoader.load(VisionReceiptSourceRepository.OPERATIONS_MSSQL));
    }

    @Test
    void data_platform_켜지면_warehouse_jdbc_와_postgres_sql_4개를_쓴다() {
        when(warehouseJdbc.queryForList(any(String.class), any(MapSqlParameterSource.class))).thenReturn(List.of());
        VisionReceiptSourceRepository repo =
                new VisionReceiptSourceRepository(statsJdbc, warehouseJdbc, true);

        repo.findPayments(FROM, TO);
        repo.findItemDetails(FROM, TO);
        repo.findItemFallbacks(FROM, TO);
        repo.findOperations(FROM, TO);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(warehouseJdbc, times(4)).queryForList(sqlCaptor.capture(), any(MapSqlParameterSource.class));
        verifyNoInteractions(statsJdbc);

        assertThat(sqlCaptor.getAllValues().get(0)).isEqualTo(SqlLoader.load(VisionReceiptSourceRepository.PAYMENTS_WAREHOUSE));
        assertThat(sqlCaptor.getAllValues().get(1)).isEqualTo(SqlLoader.load(VisionReceiptSourceRepository.ITEM_DETAILS_WAREHOUSE));
        assertThat(sqlCaptor.getAllValues().get(2)).isEqualTo(SqlLoader.load(VisionReceiptSourceRepository.ITEMS_WAREHOUSE));
        assertThat(sqlCaptor.getAllValues().get(3)).isEqualTo(SqlLoader.load(VisionReceiptSourceRepository.OPERATIONS_WAREHOUSE));
    }
}
