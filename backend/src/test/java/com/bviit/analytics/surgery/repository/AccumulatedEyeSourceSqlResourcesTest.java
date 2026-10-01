package com.bviit.analytics.surgery.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AccumulatedEyeSourceSqlResourcesTest {

    @Test
    void mssql_select_accumulated_eyes_는_MSSQL_방언과_camelCase_별칭을_보존한다() {
        String sql = SqlLoader.load(AccumulatedEyeSourceRepository.SQL_MSSQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM OPERATION_ACCUMULATED_EYE_COUNT")
                .contains("DATEADD(day, 1, CAST(:to AS DATE))")
                .contains("AS \"custNum\"")
                .contains("AS \"operationDate\"")
                .contains("AS \"accumulatedEyeCount\"")
                .contains("ORDER BY OPERATION_DATE ASC, ACCUMULATED_EYE_COUNT ASC");
    }

    @Test
    void warehouse_select_accumulated_eyes_는_Postgres_방언과_raw_스키마를_사용한다() {
        String sql = SqlLoader.load(AccumulatedEyeSourceRepository.SQL_WAREHOUSE);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM raw.raw_crm_operation_accumulated_eye_count")
                .contains("CAST(:to AS date) + interval '1 day'")
                .contains("AS \"custNum\"")
                .contains("AS \"operationDate\"")
                .contains("AS \"accumulatedEyeCount\"")
                .contains("ORDER BY operation_date ASC, accumulated_eye_count ASC");
    }
}
