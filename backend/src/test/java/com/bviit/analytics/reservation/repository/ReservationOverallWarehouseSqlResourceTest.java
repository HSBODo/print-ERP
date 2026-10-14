package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 종합·네이버·카카오 warehouse SQL 의 Postgres 방언 잠금 — RECONCILE wave 2 (2026-10-06). */
class ReservationOverallWarehouseSqlResourceTest {

    @Test
    void warehouse_종합_sql은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(ReservationOverallStatsRepository.MONTHLY_SQL_WAREHOUSE);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_crm_reservation")
                .contains("EXTRACT(YEAR FROM r.inserteddatetime)")
                .contains("EXTRACT(MONTH FROM r.inserteddatetime)")
                .contains("r.reserve_flag = 'M'")
                .contains("r.reserve_jinryo IN ('', '5', '6', '7', '24', '25')")
                .contains("r.cust_num = '8888888888888'")
                .contains("COALESCE(CAST(r.reserve_seq AS varchar), '') NOT IN ('8', '5')")
                .contains("AS cnt", "AS online_cnt", "AS call_cnt")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("ISNULL(")
                .doesNotContain("YEAR(").doesNotContain("MONTH(");
    }

    @Test
    void warehouse_네이버_sql은_취소제외와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(ReservationOverallStatsRepository.MONTHLY_NAVER_SQL_WAREHOUSE);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_crm_reservation")
                .contains("r.reserve_path = 'NAVER'")
                .contains("r.reserve_flag = 'M'")
                .contains("r.reserve_jinryo IN ('', '5', '6', '7')")
                .contains("COALESCE(r.reserve_state, '') <> 'C'")
                .contains("COUNT(DISTINCT r.reserve_num)")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("ISNULL(")
                .doesNotContain("B2B", "재검", "차트있음");
    }

    @Test
    void warehouse_카카오_sql은_해피톡_신환과_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(ReservationOverallStatsRepository.MONTHLY_KAKAO_SQL_WAREHOUSE);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_crm_happytalk_counsel_list")
                .contains("raw.raw_crm_happytalk_category01")
                .contains("raw.raw_crm_happytalk_category02")
                .contains("C01.name = '수술전'")
                .contains("C02.name = '★신환'")
                .contains("TO_CHAR(H.inserteddatetime, 'YYYY-MM-DD HH24:MI:SS.MS')")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("CONVERT(VARCHAR");
    }
}
