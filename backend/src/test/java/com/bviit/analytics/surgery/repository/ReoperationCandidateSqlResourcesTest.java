package com.bviit.analytics.surgery.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReoperationCandidateSqlResourcesTest {

    @Test
    void mssql_select_reoperation_candidates_는_MSSQL_방언과_통화포맷을_보존한다() {
        String sql = SqlLoader.load(ReoperationCandidateRepository.SQL_MSSQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM RE_OPERATION r WITH(NOLOCK)")
                .contains("LEFT JOIN CUSTOM cu WITH(NOLOCK)")
                .contains("SELECT TOP 1 e.EMP_NAME")
                .contains("CONVERT(money")
                .contains("N'신환'")
                .contains("REASON_CD");
    }

    @Test
    void warehouse_select_reoperation_candidates_는_Postgres_방언과_raw_스키마를_사용한다() {
        String sql = SqlLoader.load(ReoperationCandidateRepository.SQL_WAREHOUSE);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM raw.raw_crm_re_operation r")
                .contains("LEFT JOIN raw.raw_crm_custom cu")
                .contains("FROM raw.raw_crm_employee e")
                .contains("FROM raw.raw_crm_costprice cp")
                .contains("LIMIT 1")
                .contains("TO_CHAR")
                .contains("'FM999,999,999,990.00'")
                .contains("AS \"chartNo\"")
                .contains("AS \"reopDate\"")
                .contains("AS \"autoIncluded\"")
                .contains("AS \"excludeReason\"");
    }
}
