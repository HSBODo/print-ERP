package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 온라인 예약(2026-06~) 구성요소 SQL 불변식 — 네이버·카카오톡 (warehouse).
 */
class ReservationOverallSqlResourceTest {

    /** 주석 제거 + 공백 정규화 — 주석 문구가 단언을 통과시키면 안 된다. */
    private static String sqlBody(String resource) {
        return SqlLoader.load(resource)
                .replaceAll("--[^\\n]*", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    @Test
    void 네이버_sql은_RSS_기준을_보존한다() {
        String sql = sqlBody(ReservationOverallStatsRepository.MONTHLY_NAVER_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("r.reserve_path = 'NAVER'")
                .contains("r.reserve_flag = 'M'")
                .contains("r.reserve_jinryo IN ('', '5', '6', '7')")
                .doesNotContain("B2B", "재검", "차트있음", "RESERVE_SEQ");
    }

    @Test
    void 카카오_sql은_해피톡_신환_기준을_보존한다() {
        String sql = sqlBody(ReservationOverallStatsRepository.MONTHLY_KAKAO_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_crm_happytalk_counsel_list")
                .contains("raw.raw_crm_happytalk_category01")
                .contains("raw.raw_crm_happytalk_category02");
    }

    @Test
    void 종합_sql은_기존_공식을_유지한다() {
        String sql = sqlBody(ReservationOverallStatsRepository.MONTHLY_SQL);

        assertThat(sql)
                .contains("r.reserve_path IN ('ONLINE', 'APP', 'NAVER')")
                .contains("r.reserve_path IN ('CTI', 'CRM')")
                .contains("r.reserve_flag = 'M'");
    }
}
