package com.bviit.analytics.accounting.repository;

import com.bviit.analytics.common.util.OpenQuerySql;
import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 진료 수납 원천 조회 — 의사랑(IPLUS) EMR. SOFTCRM MSSQL(statsJdbcTemplate) 을 거쳐
 * 링크드서버 [220.85.109.240] 로 OPENQUERY 한다 (안쪽 쿼리는 sql/iplus/accounting/*-inner.sql).
 *
 * <p>링크드서버가 죽으면 조회 전체가 실패한다 — 호출측(MedicalReceiptImportService)이 REQUIRES_NEW 로 격리한다.
 * READ-ONLY · 날짜는 치환 전 ISO 형식을 재검증한다(OpenQuerySql).
 */
@Repository
@Profile("postgres-mart")
public class MedicalReceiptSourceRepository {

    static final String RECEIPTS_SQL = "sql/iplus/accounting/select-medical-receipts-inner.sql";
    static final String MONTHLY_SQL = "sql/iplus/accounting/select-medical-monthly-inner.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String receiptsInner;
    private final String monthlyInner;

    public MedicalReceiptSourceRepository(@Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.receiptsInner = SqlLoader.load(RECEIPTS_SQL);
        this.monthlyInner = SqlLoader.load(MONTHLY_SQL);
    }

    /** 외래+입원 수납 원장 행 (수납일 범위 · camelCase 키 · 2026-01-01 이후 _New 체계). */
    public List<Map<String, Object>> findReceipts(LocalDate from, LocalDate to) {
        String sql = OpenQuerySql.wrapForIplus(receiptsInner, from.toString(), to.toString());
        return jdbc.getJdbcOperations().queryForList(sql);
    }

    /** 월합 조각 (src · ym · cnt · v1~v5) — MedicalMonthlyFolder 가 (연,월) 로 접는다. */
    public List<Map<String, Object>> findMonthlyParts(LocalDate from, LocalDate to) {
        String sql = OpenQuerySql.wrapForIplus(monthlyInner, from.toString(), to.toString());
        return jdbc.getJdbcOperations().queryForList(sql);
    }
}
