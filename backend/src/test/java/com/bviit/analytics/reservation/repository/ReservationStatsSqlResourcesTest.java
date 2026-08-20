package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationStatsSqlResourcesTest {

    @Test
    void monthly_by_type_sql은_수술_외래_드림렌즈_집계를_보존한다() {
        String sql = SqlLoader.load(ReservationStatsRepository.MONTHLY_BY_TYPE_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("YEAR(r.RESERVE_DATE) AS yr")
                .contains("MONTH(r.RESERVE_DATE) AS mo")
                .contains("r.RESERVE_FLAG = 'O'")
                .contains("r.RESERVE_JINRYO = '2'")
                .contains("r.RESERVE_FLAG = 'D'")
                .contains("r.RESERVE_STATE <> 'C'")
                .contains("GROUP BY YEAR(r.RESERVE_DATE), MONTH(r.RESERVE_DATE)");
    }
}
