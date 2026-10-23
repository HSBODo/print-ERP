package com.bviit.analytics.outpatient.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 외래수 월별 집계 SQL(warehouse) 의 계약 잠금. */
class OutpatientCountStatsSqlResourceTest {

    @Test
    void warehouse_sql은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(OutpatientCountStatsRepository.FIND_OUTPATIENT_COUNT_MONTHLY_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_crm_reservation")
                .contains("raw.raw_crm_custom")
                .contains("r.reserve_flag = 'F'")
                .contains("r.reserve_state IN ('I','H')")
                .contains("COALESCE(cu.cust_name, '')")
                .contains("SUBSTRING(r.reserve_date FROM 1 FOR 4)")
                .contains("SUBSTRING(r.reserve_date FROM 6 FOR 2)")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("WITH (NOLOCK)")
                .doesNotContain("ISNULL(").doesNotContain("N'%");
    }
}
