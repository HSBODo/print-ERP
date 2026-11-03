package com.bviit.analytics.surgery.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SurgeryListSqlResourcesTest {

    @Test
    void warehouse_select_surgery_list_는_Postgres_방언과_raw_스키마를_사용한다() {
        String sql = SqlLoader.load(SurgeryListRepository.SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("WITH cataract_ops AS")
                .contains("FROM raw.raw_crm_cataract_operationdata c")
                .contains("FROM raw.raw_crm_operationdata op")
                .contains("FROM raw.raw_crm_reservation r")
                .contains("FROM raw.raw_crm_exam e")
                .contains("FROM raw.raw_crm_cataract_exam ce")
                .contains("FROM raw.raw_crm_costprice cp")
                .contains("JOIN raw.raw_crm_custom cu ON")
                .contains("LEFT JOIN LATERAL (")
                .contains("CROSS JOIN LATERAL (")
                .contains("LIMIT 1")
                .contains("TO_CHAR")
                .contains("LENGTH(LTRIM(RTRIM(COALESCE(rsv.reserve_num, '')))) >= 6")
                .contains("AS \"surgeryCategory\"")
                .contains("AS \"chartNo\"")
                .contains("AS \"payment\"")
                .contains("AS \"regDate\"");
    }
}
