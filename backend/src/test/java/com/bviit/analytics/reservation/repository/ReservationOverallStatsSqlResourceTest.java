package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationOverallStatsSqlResourceTest {

    @Test
    void reservation_overall_monthly_sql은_채널_집계와_제외필터를_보존한다() {
        String sql = SqlLoader.load(ReservationOverallStatsRepository.MONTHLY_SQL_MSSQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("COUNT(DISTINCT CASE WHEN (r.RESERVE_PATH IN ('CTI', 'CRM'))")
                .contains("r.RESERVE_PATH IN ('ONLINE', 'APP', 'NAVER')")
                .contains("AS cnt", "AS online_cnt", "AS call_cnt")
                .contains("FROM RESERVATION r WITH(NOLOCK)")
                .contains("r.InsertedDateTime >= :from AND r.InsertedDateTime <= :to")
                .contains("r.RESERVE_FLAG = 'M'")
                .contains("r.RESERVE_JINRYO IN ('', '5', '6', '7', '24', '25')")
                .contains("'%테스트%'", "'%TEST%'", "'8888888888888'")
                .contains("ISNULL(r.RESERVE_SEQ, '') NOT IN ('8', '5')")
                .contains("'%B2B(군인)%'", "'%재검%'", "'%중복%'", "'%시뮬%'", "'%차트있음%'")
                .contains("GROUP BY YEAR(r.InsertedDateTime), MONTH(r.InsertedDateTime)")
                .contains("ORDER BY yr, mo")
                .doesNotContain("OPENQUERY", "__OQ_", ".formatted");
    }
}
