package com.bviit.analytics.marketing.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * OverseasMarketing CRM 조회 SQL(warehouse) 의 계약 잠금.
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
    void customer_candidates_warehouse는_raw_스키마와_TRIM을_사용한다() {
        String sql = body(OverseasMarketingRepository.CUSTOMER_CANDIDATES_SQL);
        assertThat(sql)
                .contains("FROM raw.raw_crm_custom c")
                .contains("TRIM(c.cust_num)")
                .contains("COALESCE(c.cust_name, '')")
                .contains("%s")
                .doesNotContain("WITH(NOLOCK)", "ISNULL(", "RTRIM(");
    }

    @Test
    void customer_details_warehouse는_LATERAL과_raw_스키마_신규_3개를_참조한다() {
        String sql = body(OverseasMarketingRepository.CUSTOMER_DETAILS_SQL);
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
    void exam_date_candidates_warehouse는_SUBSTRING으로_치환된다() {
        String sql = body(OverseasMarketingRepository.EXAM_DATE_CANDIDATES_SQL);
        assertThat(sql)
                .contains("FROM raw.raw_crm_reservation r")
                .contains("JOIN raw.raw_crm_custom c")
                .contains("SUBSTRING(r.reserve_date FROM 1 FOR 10)")
                .contains(":values")
                .doesNotContain("CONVERT(", "WITH(NOLOCK)", "ISNULL(");
    }

    @Test
    void surgery_date_candidates_warehouse는_OPERATIONDATA를_참조한다() {
        String warehouse = body(OverseasMarketingRepository.SURGERY_DATE_CANDIDATES_SQL);

        assertThat(warehouse)
                .contains("FROM raw.raw_crm_operationdata o")
                .contains("SUBSTRING(o.operation_date FROM 1 FOR 10)")
                .doesNotContain("CONVERT(", "WITH(NOLOCK)");
    }

    @Test
    void outpatient_enrichment_warehouse는_LATERAL과_STRING_AGG로_치환된다() {
        String sql = body(OverseasMarketingRepository.OUTPATIENT_SQL);
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
        String sql = body(OverseasMarketingRepository.PRICE_ITEM_COSTS_SQL);
        assertThat(sql)
                .contains("FROM raw.raw_crm_costprice cp")
                .contains("JOIN raw.raw_crm_prcitmlst pr")
                .contains("TRIM(cp.cust_num)")
                .contains(":customerNos")
                .doesNotContain("WITH(NOLOCK)", "RTRIM(", "ISNULL(");
    }

    @Test
    void fallback_costs_warehouse는_EXISTS와_raw_스키마를_유지한다() {
        String sql = body(OverseasMarketingRepository.FALLBACK_COSTS_SQL);
        assertThat(sql)
                .contains("raw.raw_crm_costprice")
                .contains("raw.raw_crm_operationdata")
                .contains("EXISTS")
                .contains(":customerNos")
                .doesNotContain("WITH(NOLOCK)", "RTRIM(")
                .doesNotContain(";WITH ");
    }

    @Test
    void customer_stream_warehouse는_CUSTOM_WHERE_없이_전수_스캔한다() {
        String warehouse = body(OverseasMarketingRepository.CUSTOMER_STREAM_SQL);

        assertThat(warehouse)
                .contains("FROM raw.raw_crm_custom c")
                .contains("\"customerNo\"")
                .contains("\"birthDate\"")
                .doesNotContain("WHERE ", "WITH(NOLOCK)", "ISNULL(");
    }
}
