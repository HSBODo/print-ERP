package com.bviit.analytics.accounting.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
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
 */
@Repository
@Profile("postgres-mart")
public class VisionReceiptSourceRepository {

    static final String PAYMENTS_SQL = "sql/softcrm/accounting/select-vision-payments.sql";
    static final String ITEM_DETAILS_SQL = "sql/softcrm/accounting/select-vision-item-details.sql";
    static final String ITEMS_SQL = "sql/softcrm/accounting/select-vision-items.sql";
    static final String OPERATIONS_SQL = "sql/softcrm/accounting/select-vision-operations.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String paymentsSql;
    private final String itemDetailsSql;
    private final String itemsSql;
    private final String operationsSql;

    public VisionReceiptSourceRepository(@Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.paymentsSql = SqlLoader.load(PAYMENTS_SQL);
        this.itemDetailsSql = SqlLoader.load(ITEM_DETAILS_SQL);
        this.itemsSql = SqlLoader.load(ITEMS_SQL);
        this.operationsSql = SqlLoader.load(OPERATIONS_SQL);
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
