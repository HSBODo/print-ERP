package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CataractExamListSqlResourcesTest {

    @Test
    void warehouse_select_cataract_exam_list_는_Postgres_방언과_raw_스키마를_사용한다() {
        String sql = SqlLoader.load(CataractExamListRepository.SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM raw.raw_crm_custom B")
                .contains("JOIN raw.raw_crm_reservation D ON D.cust_num = B.cust_num")
                .contains("CROSS JOIN LATERAL")
                .contains("LEFT JOIN LATERAL")
                .contains("LIMIT 1")
                .contains("D.reserve_flag = 'H'")
                .contains("D.reserve_state NOT IN ('C', 'Y')")
                .contains("'중단'")
                .contains("'백내장'")
                .contains("TO_CHAR")
                .contains("FROM raw.raw_crm_cataract_exam c")
                .contains("LEFT JOIN raw.raw_crm_cataract_operationdata op ON")
                .contains("FROM raw.raw_crm_costprice A")
                .contains("FROM raw.raw_crm_cstprcsub")
                .contains("FROM raw.raw_crm_prcitmlst")
                .contains("JOIN raw.raw_crm_prcitmdtl D ON")
                .contains("AS \"chartNo\"")
                .contains("AS \"examDate\"")
                .contains("AS \"classification\"")
                .contains("AS \"payment\"");
    }
}
