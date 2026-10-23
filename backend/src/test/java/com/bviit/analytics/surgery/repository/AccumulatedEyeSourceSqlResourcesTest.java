package com.bviit.analytics.surgery.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AccumulatedEyeSourceSqlResourcesTest {

    @Test
    void warehouse_select_accumulated_eyes_는_Postgres_방언과_raw_스키마를_사용한다() {
        String sql = SqlLoader.load(AccumulatedEyeSourceRepository.SQL);

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
