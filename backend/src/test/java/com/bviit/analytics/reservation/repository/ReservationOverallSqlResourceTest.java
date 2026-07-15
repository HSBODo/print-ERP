package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 온라인 예약(2026-06~) 구성요소 SQL 불변식 — 네이버·카카오톡.
 *
 * 이 두 값은 '예약통계_시력교정(RSS)' 화면과 같은 숫자여야 한다는 게 이번 정의의 전제다.
 * 기준이 어긋나면 두 화면이 서로 다른 값을 말하게 된다(조용히).
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
                .contains("FROM RESERVATION r WITH(NOLOCK)")
                .contains("r.RESERVE_PATH = 'NAVER'")
                .contains("r.RESERVE_FLAG = 'M'")
                // RSS 와 동일한 진료구분 세트. 종합 SQL 의 ('24','25') 를 넣으면 기준이 갈린다.
                .contains("r.RESERVE_JINRYO IN ('', '5', '6', '7')")
                // RSS 의 '네이버_접수' 는 취소를 뺀 값이다 — 이 줄이 빠지면 과대집계.
                .contains("ISNULL(r.RESERVE_STATE, '') <> 'C'")
                .contains("COUNT(DISTINCT r.RESERVE_NUM)")
                // RSS 는 정크 제외를 적용하지 않는다 — 넣으면 RSS 화면과 값이 어긋난다.
                .doesNotContain("B2B", "재검", "차트있음", "RESERVE_SEQ");
    }

    @Test
    void 카카오_sql은_해피톡_신환_기준을_보존한다() {
        String sql = sqlBody(ReservationOverallStatsRepository.MONTHLY_KAKAO_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                // 카카오는 RESERVATION 에 없다 — 해피톡이 원천이다.
                .contains("HappyTalk_Counsel_List")
                .contains("HappyTalk_Category01")
                .contains("HappyTalk_Category02")
                .contains("C01.Name = '수술전'")
                .contains("C02.NAME = '★신환'")
                // 밀리초 dedup — 예약자 리스트의 카카오 집계와 동일 기준.
                .contains("COUNT(DISTINCT CONVERT(VARCHAR(23), H.InsertedDateTime, 21))");
    }

    @Test
    void 종합_sql은_기존_공식을_유지한다() {
        // 2026-05 이전은 이 공식을 그대로 쓴다(과거 값이 흔들리면 안 된다).
        String sql = sqlBody(ReservationOverallStatsRepository.MONTHLY_SQL);

        assertThat(sql)
                .contains("r.RESERVE_PATH IN ('ONLINE', 'APP', 'NAVER')")
                .contains("r.RESERVE_PATH IN ('CTI', 'CRM')")
                .contains("r.RESERVE_FLAG = 'M'");
    }
}
