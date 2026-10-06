package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 시력교정(시스템) 예약통계 SQL 두 방언(MSSQL / warehouse) 의 계약 잠금 — Phase 2 MART_DIRECT 이관 (2026-10-06). */
class ReservationStatsSystemSqlResourceTest {

    @Test
    void mssql_daily_counts_SQL은_OPENQUERY_와_MSSQL_방언을_유지한다() {
        String sql = SqlLoader.load(ReservationStatsSystemRepository.SQL_MSSQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("OPENQUERY(EICN_MySQL")
                .contains("stat_user_inbound_bseye")
                .contains("__OQ_FROM__").contains("__OQ_TO__")
                .contains("CtiRptLst").contains("CtiClg")
                .contains("HappyTalk_Counsel_List")
                .contains("DB_CUSTOM").contains("DB_ReCounsel")
                .contains("RESERVATION_NAVER")
                .contains("CONVERT(VARCHAR(10),")
                .contains("DATEADD(DAY,1");
    }

    @Test
    void warehouse_daily_counts_SQL은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(ReservationStatsSystemRepository.SQL_WAREHOUSE);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_eicn_stat_user_inbound_bseye")   // OPENQUERY 대체
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
    void mssql_drill_down_SQL은_CROSS_APPLY_와_MSSQL_방언을_유지한다() {
        String sql = SqlLoader.load(ReservationStatsSystemRepository.DRILL_DOWN_SQL_MSSQL);

        assertThat(sql)
                .contains(":date", ":field")
                .contains("CROSS APPLY (VALUES")
                .contains("CtiRptLst").contains("HappyTalk_Counsel_List")
                .contains("OPENQUERY(EICN_MySQL")
                .contains("__OQ_DATE__")
                .contains("CONVERT(VARCHAR(10),");
    }

    @Test
    void warehouse_drill_down_SQL은_LATERAL_과_raw_스키마를_사용한다() {
        String sql = SqlLoader.load(ReservationStatsSystemRepository.DRILL_DOWN_SQL_WAREHOUSE);

        assertThat(sql)
                .contains(":date", ":field")
                .contains("CROSS JOIN LATERAL (VALUES")             // CROSS APPLY 대체
                .contains("raw.raw_crm_ctirptlst")
                .contains("raw.raw_crm_happytalk_counsel_list")
                .contains("raw.raw_eicn_stat_user_inbound_bseye")   // OPENQUERY 대체
                .contains("AS \"custNum\"").contains("AS \"reserveNum\"")
                .contains("AS \"primaryKey\"").contains("AS \"exclusionReasonCandidate\"")
                .doesNotContain("CROSS APPLY").doesNotContain("OPENQUERY").doesNotContain("__OQ_")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("ISNULL(")
                .doesNotContain("#naver");
    }
}
