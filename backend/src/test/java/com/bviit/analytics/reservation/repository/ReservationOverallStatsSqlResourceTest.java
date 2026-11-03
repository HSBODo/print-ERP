package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationOverallStatsSqlResourceTest {

    @Test
    void reservation_overall_monthly_sql은_채널_집계와_제외필터를_보존한다() {
        String sql = SqlLoader.load(ReservationOverallStatsRepository.MONTHLY_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("r.reserve_path IN ('ONLINE', 'APP', 'NAVER')")
                .contains("r.reserve_path IN ('CTI', 'CRM')")
                .contains("r.reserve_flag = 'M'")
                .contains("r.reserve_jinryo IN ('', '5', '6', '7', '24', '25')")
                .doesNotContain("OPENQUERY", "__OQ_", ".formatted");
    }
}
