package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 월별 수술/외래/드림렌즈 집계 SQL 두 방언(MSSQL / warehouse) 의 계약 잠금 — RECONCILE wave (2026-10-06). */
class ReservationStatsSqlResourcesTest {

    @Test
    void mssql_monthly_by_type_sql은_수술_외래_드림렌즈_집계와_MSSQL_방언을_보존한다() {
        String sql = SqlLoader.load(ReservationStatsRepository.MONTHLY_BY_TYPE_SQL_MSSQL);

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

    @Test
    void warehouse_monthly_by_type_sql은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(ReservationStatsRepository.MONTHLY_BY_TYPE_SQL_WAREHOUSE);

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
