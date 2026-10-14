package com.bviit.analytics.sms.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** SmsCrm 연락처 조회 SQL 두 방언(MSSQL / warehouse) 의 계약 잠금 — QUERY_DIRECT #1 (2026-10-06). */
class SmsCrmContactSqlResourceTest {

    @Test
    void mssql_sql은_SELECT_TOP_1과_CUSTOM_WITH_NOLOCK을_유지한다() {
        String sql = SqlLoader.load(SmsCrmContactRepository.SELECT_PHONE_SQL_MSSQL);

        assertThat(sql)
                .contains(":chartNo")
                .contains("SELECT TOP 1")
                .contains("FROM CUSTOM c WITH(NOLOCK)")
                .contains("ISNULL(c.CALL_NUM2, '')", "ISNULL(c.CALL_NUM1, '')")
                .contains("LTRIM(RTRIM(c.CUST_NUM))")
                .contains("AS phone");
    }

    @Test
    void warehouse_sql은_raw_스키마와_LIMIT을_사용한다() {
        String sql = SqlLoader.load(SmsCrmContactRepository.SELECT_PHONE_SQL_WAREHOUSE);

        assertThat(sql)
                .contains(":chartNo")
                .contains("raw.raw_crm_custom")
                .contains("LIMIT 1")
                .contains("COALESCE(c.call_num2, '')", "COALESCE(c.call_num1, '')")
                .contains("TRIM(c.cust_num)")
                .contains("AS phone")
                .doesNotContain("SELECT TOP", "WITH(NOLOCK)", "ISNULL(", "LTRIM(RTRIM(");
    }
}
