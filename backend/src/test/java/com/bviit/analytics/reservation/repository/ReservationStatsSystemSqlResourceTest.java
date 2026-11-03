package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 시력교정(시스템) 예약통계 SQL(warehouse) 의 계약 잠금. */
class ReservationStatsSystemSqlResourceTest {

    @Test
    void warehouse_daily_counts_SQL은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(ReservationStatsSystemRepository.SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_eicn_stat_user_inbound_bseye")
                .contains("raw.raw_crm_ctirptlst").contains("raw.raw_crm_cticlg")
                .contains("raw.raw_crm_happytalk_counsel_list")
                .contains("raw.raw_crm_db_custom").contains("raw.raw_crm_db_recounsel")
                .contains("raw.raw_crm_reservation_naver")
                .contains("TO_CHAR(").contains("INTERVAL '1 day'")
                .contains("AS \"inboundCall\"").contains("AS \"answeredCall\"")
                .contains("AS \"naverReceived\"").contains("AS \"naverReservation\"")
                .doesNotContain("OPENQUERY").doesNotContain("__OQ_")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("WITH (NOLOCK)")
                .doesNotContain("ISNULL(").doesNotContain("DATEADD(")
                .doesNotContain("GETDATE()").doesNotContain("#naver");
    }

    @Test
    void warehouse_drill_down_SQL은_LATERAL_과_raw_스키마를_사용한다() {
        String sql = SqlLoader.load(ReservationStatsSystemRepository.DRILL_DOWN_SQL);

        assertThat(sql)
                .contains(":date", ":field")
                .contains("CROSS JOIN LATERAL (VALUES")
                .contains("raw.raw_crm_ctirptlst")
                .contains("raw.raw_crm_happytalk_counsel_list")
                .contains("raw.raw_eicn_stat_user_inbound_bseye")
                .contains("AS \"custNum\"").contains("AS \"reserveNum\"")
                .contains("AS \"primaryKey\"").contains("AS \"exclusionReasonCandidate\"")
                .doesNotContain("CROSS APPLY").doesNotContain("OPENQUERY").doesNotContain("__OQ_")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("ISNULL(")
                .doesNotContain("#naver");
    }
}
