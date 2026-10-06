package com.bviit.analytics.accounting.repository;

import com.bviit.analytics.common.util.OpenQuerySql;
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
 * 진료 수납 원천 조회 — 의사랑(IPLUS) EMR.
 *
 * <p><b>소스 라우팅 (data-platform 프로파일 · 2026-10-06 A8 unblock)</b>
 * <ul>
 *   <li>기본: CRM(statsJdbcTemplate) 경유 → 링크드서버 [220.85.109.240] OPENQUERY → IPLUS.*.
 *       안쪽 쿼리는 sql/iplus/accounting/*-inner.sql, OpenQuerySql 이 감싼다.</li>
 *   <li>data-platform 활성: 웨어하우스(warehouseJdbcTemplate) → raw.raw_emr_* 직접 조회.
 *       sql/warehouse/accounting/select-medical-*.sql, 네임드 바인딩 :from/:to.</li>
 * </ul>
 *
 * <p>IPLUS 쌍 모델 (PAOSUNAB/_New · PAISUNAB/_New) 4개 전부 2026-10-06 쌍 모델로 적재 완료.
 * 리스트는 _New 2개만, 월별 그래프는 구+신 4개 UNION 로 2026 이전·이후 모두 커버.
 *
 * <p>READ-ONLY · OPENQUERY 경로는 호출측(MedicalReceiptImportService) 이 REQUIRES_NEW 로 격리한다.
 */
@Repository
@Profile("postgres-mart")
public class MedicalReceiptSourceRepository {

    static final String RECEIPTS_SQL_MSSQL     = "sql/iplus/accounting/select-medical-receipts-inner.sql";
    static final String RECEIPTS_SQL_WAREHOUSE = "sql/warehouse/accounting/select-medical-receipts.sql";
    static final String MONTHLY_SQL_MSSQL      = "sql/iplus/accounting/select-medical-monthly-inner.sql";
    static final String MONTHLY_SQL_WAREHOUSE  = "sql/warehouse/accounting/select-medical-monthly.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String receiptsSql;
    private final String monthlySql;
    private final boolean dataPlatformEnabled;

    public MedicalReceiptSourceRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate statsJdbc,
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc,
            @Value("${data-platform.enabled:false}") boolean dataPlatformEnabled
    ) {
        this.jdbc = dataPlatformEnabled ? warehouseJdbc : statsJdbc;
        this.dataPlatformEnabled = dataPlatformEnabled;
        this.receiptsSql = SqlLoader.load(dataPlatformEnabled ? RECEIPTS_SQL_WAREHOUSE : RECEIPTS_SQL_MSSQL);
        this.monthlySql  = SqlLoader.load(dataPlatformEnabled ? MONTHLY_SQL_WAREHOUSE  : MONTHLY_SQL_MSSQL);
    }

    /** 외래+입원 수납 원장 행 (수납일 범위 · camelCase 키 · 2026-01-01 이후 _New 체계). */
    public List<Map<String, Object>> findReceipts(LocalDate from, LocalDate to) {
        if (dataPlatformEnabled) {
            return jdbc.queryForList(receiptsSql, dateRangeParams(from, to));
        }
        String sql = OpenQuerySql.wrapForIplus(receiptsSql, from.toString(), to.toString());
        return jdbc.getJdbcOperations().queryForList(sql);
    }

    /** 월합 조각 (src · ym · cnt · v1~v5) — MedicalMonthlyFolder 가 (연,월) 로 접는다. */
    public List<Map<String, Object>> findMonthlyParts(LocalDate from, LocalDate to) {
        if (dataPlatformEnabled) {
            return jdbc.queryForList(monthlySql, dateRangeParams(from, to));
        }
        String sql = OpenQuerySql.wrapForIplus(monthlySql, from.toString(), to.toString());
        return jdbc.getJdbcOperations().queryForList(sql);
    }

    private MapSqlParameterSource dateRangeParams(LocalDate from, LocalDate to) {
        return new MapSqlParameterSource()
                .addValue("from", from.toString())
                .addValue("to", to.toString());
    }
}
