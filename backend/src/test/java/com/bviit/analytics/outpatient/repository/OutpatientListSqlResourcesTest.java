package com.bviit.analytics.outpatient.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OutpatientListSqlResourcesTest {

    @Test
    void warehouse_select_outpatient_list_는_Postgres_방언과_double_quoted_alias_를_사용한다() {
        String sql = SqlLoader.load(OutpatientListRepository.SQL);

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
