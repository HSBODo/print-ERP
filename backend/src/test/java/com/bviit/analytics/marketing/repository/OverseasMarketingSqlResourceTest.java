package com.bviit.analytics.marketing.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * OverseasMarketing CRM 조회 SQL 두 방언(MSSQL / warehouse) 의 계약 잠금.
 * QUERY_DIRECT #2 — 2026-10-07 데이터 플랫폼 이관.
 */
class OverseasMarketingSqlResourceTest {

    /** 주석(`-- ...`)을 제거해 본문만 어서션 — 방언 변환 설명이 banned keyword 와 충돌하지 않도록. */
    private static String body(String resource) {
        String sql = SqlLoader.load(resource);
        return Arrays.stream(sql.split("\n"))
                .filter(line -> !line.trim().startsWith("--"))
                .collect(Collectors.joining("\n"));
    }

    @Test
    void customer_candidates_mssql은_CUSTOM_WITH_NOLOCK을_유지한다() {
        String sql = body(OverseasMarketingRepository.CUSTOMER_CANDIDATES_SQL_MSSQL);
        assertThat(sql)
                .contains("FROM CUSTOM c WITH(NOLOCK)")
                .contains("RTRIM(c.CUST_NUM)")
                .contains("ISNULL(c.CUST_NAME, '')")
                .contains("%s");
    }

    @Test
    void customer_candidates_warehouse는_raw_스키마와_TRIM을_사용한다() {
        String sql = body(OverseasMarketingRepository.CUSTOMER_CANDIDATES_SQL_WAREHOUSE);
        assertThat(sql)
                .contains("FROM raw.raw_crm_custom c")
                .contains("TRIM(c.cust_num)")
                .contains("COALESCE(c.cust_name, '')")
                .contains("%s")
                .doesNotContain("WITH(NOLOCK)", "ISNULL(", "RTRIM(");
    }

    @Test
    void customer_details_mssql은_OUTER_APPLY와_LENS_LENS_CFG를_참조한다() {
        String sql = body(OverseasMarketingRepository.CUSTOMER_DETAILS_SQL_MSSQL);
        assertThat(sql)
                .contains("OUTER APPLY")
                .contains("CUSTOM_HISTORY")
                .contains("LENS")
                .contains("LENS_CFG")
                .contains("NationCustom_CFG")
                .contains(":customerNos");
    }

    @Test
    void customer_details_warehouse는_LATERAL과_raw_스키마_신규_3개를_참조한다() {
        String sql = body(OverseasMarketingRepository.CUSTOMER_DETAILS_SQL_WAREHOUSE);
        assertThat(sql)
                .contains("LEFT JOIN LATERAL")
                .contains("raw.raw_crm_custom_history")
                .contains("raw.raw_crm_lens")
                .contains("raw.raw_crm_lens_cfg")
                .contains("raw.raw_crm_nationcustom_cfg")
                .contains(":customerNos")
                .doesNotContain("OUTER APPLY", "WITH(NOLOCK)", "ISNULL(", "SELECT TOP");
    }

    @Test
    void exam_date_candidates_mssql은_CONVERT_date를_유지한다() {
        String sql = body(OverseasMarketingRepository.EXAM_DATE_CANDIDATES_SQL_MSSQL);
        assertThat(sql)
                .contains("FROM RESERVATION r WITH(NOLOCK)")
                .contains("CONVERT(varchar(10)")
                .contains(":values");
    }

    @Test
    void exam_date_candidates_warehouse는_SUBSTRING으로_치환된다() {
        String sql = body(OverseasMarketingRepository.EXAM_DATE_CANDIDATES_SQL_WAREHOUSE);
        assertThat(sql)
                .contains("FROM raw.raw_crm_reservation r")
                .contains("JOIN raw.raw_crm_custom c")
                .contains("SUBSTRING(r.reserve_date FROM 1 FOR 10)")
                .contains(":values")
                .doesNotContain("CONVERT(", "WITH(NOLOCK)", "ISNULL(");
    }

    @Test
    void surgery_date_candidates_mssql과_warehouse는_각각_OPERATIONDATA를_참조한다() {
        String mssql = body(OverseasMarketingRepository.SURGERY_DATE_CANDIDATES_SQL_MSSQL);
        String warehouse = body(OverseasMarketingRepository.SURGERY_DATE_CANDIDATES_SQL_WAREHOUSE);

        assertThat(mssql)
                .contains("FROM OPERATIONDATA o WITH(NOLOCK)")
                .contains("CONVERT(varchar(10)");
        assertThat(warehouse)
                .contains("FROM raw.raw_crm_operationdata o")
                .contains("SUBSTRING(o.operation_date FROM 1 FOR 10)")
                .doesNotContain("CONVERT(", "WITH(NOLOCK)");
    }

    @Test
    void outpatient_enrichment_mssql은_FOR_XML_PATH_STUFF를_유지한다() {
        String sql = body(OverseasMarketingRepository.OUTPATIENT_SQL_MSSQL);
        assertThat(sql)
                .contains("CROSS APPLY")
                .contains("FOR XML PATH")
                .contains("STUFF(")
                .contains("ROW_NUMBER() OVER")
                .contains(":customerNos");
    }

    @Test
    void outpatient_enrichment_warehouse는_LATERAL과_STRING_AGG로_치환된다() {
        String sql = body(OverseasMarketingRepository.OUTPATIENT_SQL_WAREHOUSE);
        assertThat(sql)
                .contains("CROSS JOIN LATERAL")
                .contains("STRING_AGG(")
                .contains("raw.raw_crm_reservation")
                .contains("raw.raw_crm_operationdata")
                .contains("raw.raw_crm_costprice")
                .contains("ROW_NUMBER() OVER")
                .contains(":customerNos")
                .doesNotContain("CROSS APPLY", "FOR XML PATH", "STUFF(", "WITH(NOLOCK)");
    }

    @Test
    void price_item_costs_warehouse는_raw_스키마와_소문자_컬럼을_사용한다() {
        String sql = body(OverseasMarketingRepository.PRICE_ITEM_COSTS_SQL_WAREHOUSE);
        assertThat(sql)
                .contains("FROM raw.raw_crm_costprice cp")
                .contains("JOIN raw.raw_crm_prcitmlst pr")
                .contains("TRIM(cp.cust_num)")
                .contains(":customerNos")
                .doesNotContain("WITH(NOLOCK)", "RTRIM(", "ISNULL(");
    }

    @Test
    void fallback_costs_warehouse는_EXISTS와_raw_스키마를_유지한다() {
        String sql = body(OverseasMarketingRepository.FALLBACK_COSTS_SQL_WAREHOUSE);
        assertThat(sql)
                .contains("raw.raw_crm_costprice")
                .contains("raw.raw_crm_operationdata")
                .contains("EXISTS")
                .contains(":customerNos")
                .doesNotContain("WITH(NOLOCK)", "RTRIM(")
                .doesNotContain(";WITH ");    // Postgres는 선두 세미콜론 불필요
    }

    @Test
    void customer_stream_mssql과_warehouse는_각각_CUSTOM_WHERE_없이_전수_스캔한다() {
        String mssql = body(OverseasMarketingRepository.CUSTOMER_STREAM_SQL_MSSQL);
        String warehouse = body(OverseasMarketingRepository.CUSTOMER_STREAM_SQL_WAREHOUSE);

        assertThat(mssql)
                .contains("FROM CUSTOM c WITH(NOLOCK)")
                .doesNotContain("WHERE ");
        assertThat(warehouse)
                .contains("FROM raw.raw_crm_custom c")
                .contains("\"customerNo\"")
                .contains("\"birthDate\"")
                .doesNotContain("WHERE ", "WITH(NOLOCK)", "ISNULL(");
    }
}
