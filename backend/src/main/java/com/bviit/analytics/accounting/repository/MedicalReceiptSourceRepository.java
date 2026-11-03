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
 * 진료 수납 원천 조회 — 웨어하우스 raw.raw_emr_* 직접 조회.
 * sql/warehouse/accounting/select-medical-*.sql, 네임드 바인딩 :from/:to.
 *
 * <p>IPLUS 쌍 모델 (PAOSUNAB/_New · PAISUNAB/_New) 4개 전부 2026-10-06 쌍 모델로 적재 완료.
 * 리스트는 _New 2개만, 월별 그래프는 구+신 4개 UNION 로 2026 이전·이후 모두 커버.
 *
 * <p>READ-ONLY.
 */
@Repository
@Profile("postgres-mart")
public class MedicalReceiptSourceRepository {

    static final String RECEIPTS_SQL = "sql/warehouse/accounting/select-medical-receipts.sql";
    static final String MONTHLY_SQL  = "sql/warehouse/accounting/select-medical-monthly.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String receiptsSql;
    private final String monthlySql;

    public MedicalReceiptSourceRepository(
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc
    ) {
        this.jdbc = warehouseJdbc;
        this.receiptsSql = SqlLoader.load(RECEIPTS_SQL);
        this.monthlySql  = SqlLoader.load(MONTHLY_SQL);
    }

    /** 외래+입원 수납 원장 행 (수납일 범위 · camelCase 키 · 2026-01-01 이후 _New 체계). */
    public List<Map<String, Object>> findReceipts(LocalDate from, LocalDate to) {
        return jdbc.queryForList(receiptsSql, dateRangeParams(from, to));
    }

    /** 월합 조각 (src · ym · cnt · v1~v5) — MedicalMonthlyFolder 가 (연,월) 로 접는다. */
    public List<Map<String, Object>> findMonthlyParts(LocalDate from, LocalDate to) {
        return jdbc.queryForList(monthlySql, dateRangeParams(from, to));
    }

    private MapSqlParameterSource dateRangeParams(LocalDate from, LocalDate to) {
        return new MapSqlParameterSource()
                .addValue("from", from.toString())
                .addValue("to", to.toString());
    }
}
