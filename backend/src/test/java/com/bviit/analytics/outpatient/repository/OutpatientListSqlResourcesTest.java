package com.bviit.analytics.outpatient.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OutpatientListSqlResourcesTest {

    @Test
    void mssql_select_outpatient_list_는_MSSQL_방언과_alias_들을_보존한다() {
        String sql = SqlLoader.load(OutpatientListRepository.SQL_MSSQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM RESERVATION rv WITH(NOLOCK)")
                .contains("JOIN CUSTOM cu WITH(NOLOCK)")
                .contains("LEFT JOIN EMPLOYEE doc WITH(NOLOCK)")
                .contains("OUTER APPLY")
                .contains("SELECT TOP 1")
                .contains("rv.RESERVE_FLAG = 'F'")
                .contains("rv.RESERVE_STATE IN ('I','H')")
                .contains("AS reserveNum")
                .contains("AS motiveL");
    }

    @Test
    void warehouse_select_outpatient_list_는_Postgres_방언과_double_quoted_alias_를_사용한다() {
        String sql = SqlLoader.load(OutpatientListRepository.SQL_WAREHOUSE);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM raw.raw_crm_reservation rv")
                .contains("JOIN raw.raw_crm_custom cu")
                .contains("LEFT JOIN raw.raw_crm_employee doc")
                .contains("LEFT JOIN raw.raw_crm_medical_sub_cfg ms")
                .contains("LEFT JOIN raw.raw_crm_nationcustom_cfg nation")
                .contains("LEFT JOIN raw.raw_crm_etccfg ins")
                .contains("LEFT JOIN LATERAL (")
                .contains("FROM raw.raw_crm_motive_new02 m2")
                .contains("LIMIT 1")
                .contains(") motive ON true")
                .contains("rv.reserve_flag = 'F'")
                .contains("rv.reserve_state IN ('I','H')")
                .contains("AS \"reserveNum\"")
                .contains("AS \"motiveL\"")
                .contains("m2.section::text");
    }
}
