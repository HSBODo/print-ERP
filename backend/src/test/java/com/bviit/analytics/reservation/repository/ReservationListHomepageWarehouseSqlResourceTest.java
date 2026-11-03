package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * warehouse 전용 Homepage SQL 리소스 잠금 — 2026-10-06 선제 이관.
 * mariadb/sqlite 쪽 ReservationListHomepageSqlResourceTest 와 쌍으로 유지한다.
 */
class ReservationListHomepageWarehouseSqlResourceTest {

    private static String sqlBody(String fileName) {
        return SqlLoader.load("sql/warehouse/homepage/" + fileName)
                .replaceAll("--[^\\n]*", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    @Test
    void warehouse_list_sql은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = sqlBody("select-reservation-list-homepage.sql");

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_homepage_tbl_counsel")
                .contains("category = 'COUNSELONLINE'")
                .contains("del_tf = 'N'")
                .contains("CAST(c_no AS text)")
                .contains("TO_CHAR(reg_date, 'YYYY-MM-DD HH24:MI:SS')")
                .contains("CAST(:to AS date) + INTERVAL '1 day'")
                .contains("ORDER BY c_no DESC")
                .contains("AS \"legacyNo\"", "AS \"deviceType\"", "AS \"name\"", "AS \"phone\"",
                          "AS \"reserveDate\"", "AS \"reserveTime\"", "AS \"utmSource\"",
                          "AS \"utmMedium\"", "AS \"utmCampaign\"", "AS \"referralCode\"",
                          "AS \"examType\"", "AS \"surgeryTf\"", "AS \"isReserve\"", "AS \"regDate\"")
                .contains("'%테스트%'", "'%TEST%'")
                .doesNotContain("TBL_COUNSEL", "DATE_FORMAT(", "DATE_ADD(", "YEAR(", "MONTH(");
    }

    @Test
    void warehouse_last_reg_date_sql은_필터없이_MAX_regdate를_읽는다() {
        String sql = sqlBody("select-last-reg-date.sql");

        assertThat(sql)
                .contains("raw.raw_homepage_tbl_counsel")
                .contains("MAX(reg_date)")
                .contains("TO_CHAR(")
                .contains("category = 'COUNSELONLINE'")
                .contains("AS \"lastRegDate\"")
                .doesNotContain("del_tf")  // 신선도 판단 — 삭제건 필터 미적용
                .doesNotContain("DATE_FORMAT");
    }

    @Test
    void warehouse_monthly_list_raw_sql은_EXTRACT로_연월_뽑는다() {
        String sql = sqlBody("select-monthly-list-raw.sql");

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_homepage_tbl_counsel")
                .contains("EXTRACT(YEAR FROM reg_date)")
                .contains("EXTRACT(MONTH FROM reg_date)")
                .contains("AS yr", "AS mo", "AS cnt")
                .contains("del_tf = 'N'")
                .contains("'%테스트%'", "'%TEST%'")
                .doesNotContain("YEAR(", "MONTH(", "DATE_ADD(");
    }

    @Test
    void warehouse_daily_list_raw_sql은_TO_CHAR_일별_버킷을_쓴다() {
        String sql = sqlBody("select-daily-list-raw.sql");

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_homepage_tbl_counsel")
                .contains("TO_CHAR(reg_date, 'YYYY-MM-DD')")
                .contains("AS d", "AS cnt")
                .contains("del_tf = 'N'")
                .doesNotContain("DATE_FORMAT(", "DATE_ADD(");
    }
}
