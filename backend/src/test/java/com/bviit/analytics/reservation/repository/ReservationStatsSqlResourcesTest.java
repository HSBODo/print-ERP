package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 월별 수술/외래/드림렌즈 집계 SQL(warehouse) 의 계약 잠금. */
class ReservationStatsSqlResourcesTest {

    @Test
    void warehouse_monthly_by_type_sql은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(ReservationStatsRepository.MONTHLY_BY_TYPE_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_crm_reservation")
                .contains("SUBSTRING(r.reserve_date FROM 1 FOR 4)")
                .contains("SUBSTRING(r.reserve_date FROM 6 FOR 2)")
                .contains("r.reserve_flag = 'O'")
                .contains("r.reserve_jinryo = '2'")
                .contains("r.reserve_flag = 'D'")
                .contains("r.reserve_state <> 'C'")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("WITH (NOLOCK)")
                .doesNotContain("YEAR(").doesNotContain("MONTH(");
    }
}
