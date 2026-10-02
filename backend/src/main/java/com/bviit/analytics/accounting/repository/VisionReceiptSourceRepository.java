package com.bviit.analytics.accounting.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 시력교정 매출 원천 조회 — SOFTCRM 비급여 수납 (CstPrcSub · PrcItmDtl · PrcItmLst · OPERATIONDATA).
 * 네 조회를 따로 읽고 VisionReceiptAssembler 가 합친다. READ-ONLY · MSSQL 2014 / jTDS 호환.
 *
 * <p><b>소스 라우팅 (data-platform 프로파일)</b>
 * <ul>
 *   <li>기본: CRM 직접연결 (statsJdbcTemplate) + `sql/softcrm/accounting/*.sql` 4개.</li>
 *   <li>data-platform 활성: 데이터 플랫폼 (warehouseJdbcTemplate) + `sql/warehouse/accounting/*.sql` 4개.</li>
 * </ul>
 *
 * <p>정본 전략: {@code docs/data-platform/migration-strategy.md}. 이관 이력: 2026-09-30 A7.
 */
@Repository
@Profile("postgres-mart")
public class VisionReceiptSourceRepository {

    static final String PAYMENTS_MSSQL = "sql/softcrm/accounting/select-vision-payments.sql";
    static final String PAYMENTS_WAREHOUSE = "sql/warehouse/accounting/select-vision-payments.sql";
    static final String ITEM_DETAILS_MSSQL = "sql/softcrm/accounting/select-vision-item-details.sql";
    static final String ITEM_DETAILS_WAREHOUSE = "sql/warehouse/accounting/select-vision-item-details.sql";
    static final String ITEMS_MSSQL = "sql/softcrm/accounting/select-vision-items.sql";
    static final String ITEMS_WAREHOUSE = "sql/warehouse/accounting/select-vision-items.sql";
    static final String OPERATIONS_MSSQL = "sql/softcrm/accounting/select-vision-operations.sql";
    static final String OPERATIONS_WAREHOUSE = "sql/warehouse/accounting/select-vision-operations.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String paymentsSql;
    private final String itemDetailsSql;
    private final String itemsSql;
    private final String operationsSql;

    public VisionReceiptSourceRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate statsJdbc,
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc,
            @Value("${data-platform.enabled:false}") boolean dataPlatformEnabled) {
        this.jdbc = dataPlatformEnabled ? warehouseJdbc : statsJdbc;
        this.paymentsSql    = SqlLoader.load(dataPlatformEnabled ? PAYMENTS_WAREHOUSE    : PAYMENTS_MSSQL);
        this.itemDetailsSql = SqlLoader.load(dataPlatformEnabled ? ITEM_DETAILS_WAREHOUSE : ITEM_DETAILS_MSSQL);
        this.itemsSql       = SqlLoader.load(dataPlatformEnabled ? ITEMS_WAREHOUSE       : ITEMS_MSSQL);
        this.operationsSql  = SqlLoader.load(dataPlatformEnabled ? OPERATIONS_WAREHOUSE  : OPERATIONS_MSSQL);
    }

    public List<Map<String, Object>> findPayments(LocalDate from, LocalDate to) {
        return jdbc.queryForList(paymentsSql, range(from, to));
    }

    public List<Map<String, Object>> findItemDetails(LocalDate from, LocalDate to) {
        return jdbc.queryForList(itemDetailsSql, range(from, to));
    }

    public List<Map<String, Object>> findItemFallbacks(LocalDate from, LocalDate to) {
        return jdbc.queryForList(itemsSql, range(from, to));
    }

    public List<Map<String, Object>> findOperations(LocalDate from, LocalDate to) {
        return jdbc.queryForList(operationsSql, range(from, to));
    }

    private static MapSqlParameterSource range(LocalDate from, LocalDate to) {
        return new MapSqlParameterSource()
                .addValue("from", from.toString())
                .addValue("to", to.toString());
    }
}
