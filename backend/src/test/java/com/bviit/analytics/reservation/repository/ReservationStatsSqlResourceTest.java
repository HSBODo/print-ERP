package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReservationStatsSqlResourceTest {

    private static final String SYSTEM_SQL = "sql/softcrm/reservation/stats/select-system-daily-counts.sql";
    private static final String CATARACT_SQL = "sql/softcrm/reservation/stats/select-cataract-daily-counts.sql";
    private static final String SYSTEM_DRILL_DOWN_SQL = "sql/softcrm/reservation/stats/select-system-drill-down.sql";
    private static final String CATARACT_DRILL_DOWN_SQL = "sql/softcrm/reservation/stats/select-cataract-drill-down.sql";

    @Test
    void system_sql은_openquery_placeholder만_iso_날짜로_치환한다() {
        String baseSql = SqlLoader.load(SYSTEM_SQL);
        String resolvedSql = ReservationStatsSystemRepository.resolveSystemSql(baseSql, "2026-06-01", "2026-06-23");

        assertThat(resolvedSql)
                .contains("'2026-06-01'", "'2026-06-23'")
                .doesNotContain("__OQ_FROM__", "__OQ_TO__")
                .contains(":from", ":to", "OPENQUERY(EICN_MySQL", "#naver", "SET NOCOUNT ON");
        assertThat(countOccurrences(resolvedSql, ":from")).isEqualTo(countOccurrences(baseSql, ":from"));
        assertThat(countOccurrences(resolvedSql, ":to")).isEqualTo(countOccurrences(baseSql, ":to"));
    }

    @Test
    void system_sql은_잘못된_openquery_치환_날짜를_거부한다() {
        String baseSql = SqlLoader.load(SYSTEM_SQL);

        assertThatThrownBy(() -> ReservationStatsSystemRepository.resolveSystemSql(baseSql, "2026-6-1", "2026-06-23"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ReservationStatsSystemRepository.resolveSystemSql(baseSql, "2026-06-01'; DROP", "2026-06-23"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void system_drill_down_sql은_openquery_일자만_치환하고_field_바인딩을_보존한다() {
        String baseSql = SqlLoader.load(SYSTEM_DRILL_DOWN_SQL);
        String resolvedSql = ReservationStatsSystemRepository.resolveSystemDrillDownSql(baseSql, "2026-06-22");

        assertThat(resolvedSql)
                .contains("'2026-06-22'", ":date", ":field")
                .contains("OPENQUERY(EICN_MySQL", "CROSS APPLY", "naverReservation")
                .contains("custNum", "reserveNum", "reserveState", "exclusionReasonCandidate")
                .doesNotContain("__OQ_DATE__");
        assertThat(countOccurrences(resolvedSql, ":date")).isEqualTo(countOccurrences(baseSql, ":date"));
        assertThat(countOccurrences(resolvedSql, ":field")).isEqualTo(countOccurrences(baseSql, ":field"));
    }

    @Test
    void system_drill_down_sql은_잘못된_openquery_치환_날짜를_거부한다() {
        String baseSql = SqlLoader.load(SYSTEM_DRILL_DOWN_SQL);

        assertThatThrownBy(() -> ReservationStatsSystemRepository.resolveSystemDrillDownSql(baseSql, "2026-6-22"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ReservationStatsSystemRepository.resolveSystemDrillDownSql(baseSql, "2026-06-22'; DROP"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void cataract_sql은_named_parameter와_핵심_계산_마커를_보존한다() {
        String sql = SqlLoader.load(CATARACT_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("Cataract_Exam", "DB_CUSTOM", "HappyTalk_Counsel_List")
                // 내원은 RESERVATION(FLAG='H' STATE I/H) 기반, 날짜 종료는 반열림 < DATEADD(DAY,1,:to)로 바인딩.
                .contains("< DATEADD(DAY,1,CONVERT(datetime,:to))")
                .contains("0 AS totalPresbyopia")
                // 인입콜/응대콜은 EICN 상담원 그룹(group_code='0016') OPENQUERY로 채운다(더 이상 0 고정 아님).
                .contains("OPENQUERY(EICN_MySQL", "stat_user_inbound_bseye", "group_code", "0016", "__OQ_FROM__", "__OQ_TO__")
                .doesNotContain("0 AS inboundCall", "0 AS answeredCall");
    }

    @Test
    void cataract_sql은_openquery_placeholder만_iso_날짜로_치환한다() {
        String baseSql = SqlLoader.load(CATARACT_SQL);
        String resolvedSql = CataractStatsSystemRepository.resolveOpenQuerySql(baseSql, "2026-06-23", "2026-06-24");

        assertThat(resolvedSql)
                .contains("'2026-06-23'", "'2026-06-24'")
                .doesNotContain("__OQ_FROM__", "__OQ_TO__")
                .contains(":from", ":to", "OPENQUERY(EICN_MySQL");
        assertThat(countOccurrences(resolvedSql, ":from")).isEqualTo(countOccurrences(baseSql, ":from"));
        assertThat(countOccurrences(resolvedSql, ":to")).isEqualTo(countOccurrences(baseSql, ":to"));
    }

    @Test
    void cataract_sql은_잘못된_openquery_치환_날짜를_거부한다() {
        String baseSql = SqlLoader.load(CATARACT_SQL);

        assertThatThrownBy(() -> CataractStatsSystemRepository.resolveOpenQuerySql(baseSql, "2026-6-23", "2026-06-24"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> CataractStatsSystemRepository.resolveOpenQuerySql(baseSql, "2026-06-23'; DROP", "2026-06-24"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void cataract_drill_down_sql은_named_parameter와_원천_row_마커를_보존한다() {
        String sql = SqlLoader.load(CATARACT_DRILL_DOWN_SQL);

        assertThat(sql)
                .contains(":date", ":field")
                .contains("CROSS APPLY", "totalCataract", "CH_EXAM", "CH_TM")
                .contains("custNum", "reserveNum", "reserveState", "exclusionReasonCandidate")
                .doesNotContain("OPENQUERY", "__OQ_");
    }

    private static int countOccurrences(String text, String token) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(token, index)) >= 0) {
            count++;
            index += token.length();
        }
        return count;
    }
}
