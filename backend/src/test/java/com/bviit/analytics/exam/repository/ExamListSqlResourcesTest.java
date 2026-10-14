package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ExamListSqlResourcesTest {

    @Test
    void mssql_select_exam_list_는_MSSQL_방언과_30컬럼_체크를_보존한다() {
        String sql = SqlLoader.load(ExamListRepository.SQL_MSSQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM EXAM e WITH(NOLOCK)")
                .contains("JOIN CUSTOM cu WITH(NOLOCK)")
                .contains("OUTER APPLY")
                .contains("SELECT TOP 1")
                .contains("e.RIGHT01")
                .contains("e.LEFT30")
                .contains("CONVERT(money");
    }

    @Test
    void warehouse_select_exam_list_는_Postgres_방언과_raw_스키마를_사용한다() {
        String sql = SqlLoader.load(ExamListRepository.SQL_WAREHOUSE);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM raw.raw_crm_exam e")
                .contains("JOIN raw.raw_crm_custom cu")
                .contains("e.cust_num = cu.cust_num")
                .contains("LEFT JOIN raw.raw_crm_operationdata op")
                .contains("FROM raw.raw_crm_cataract_exam ce")
                .contains("CROSS JOIN LATERAL")
                .contains("LEFT JOIN LATERAL")
                .contains("LIMIT 1")
                .contains("e.right01")
                .contains("e.left30")
                .contains("TO_CHAR")
                .contains("AS \"chartNo\"")
                .contains("AS \"examDate\"")
                .contains("AS \"payment\"")
                .contains("AS \"hasDreamlens\"");
    }
}
