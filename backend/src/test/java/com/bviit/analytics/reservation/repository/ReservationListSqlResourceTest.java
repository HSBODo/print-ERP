package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationListSqlResourceTest {

    @Test
    void reservation_list_sql은_named_parameter와_제외필터를_보존한다() {
        String sql = SqlLoader.load(ReservationListRepository.RESERVATION_LIST_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM RESERVATION r WITH(NOLOCK)")
                .contains("r.InsertedDateTime >= :from")
                .contains("r.InsertedDateTime < DATEADD(DAY, 1, CONVERT(datetime, :to))")
                .contains("r.RESERVE_FLAG = 'M'")
                .contains("r.RESERVE_JINRYO IN ('', '5', '6', '7', '24', '25')")
                .contains("r.RESERVE_PATH IN ('CTI', 'CRM', 'ONLINE', 'APP', 'NAVER')")
                .contains("ISNULL(r.RESERVE_SEQ, '') NOT IN ('8', '5')")
                .contains("'%B2B(군인)%'", "'%재검%'", "'%중복%'", "'%시뮬%'", "'%차트있음%'")
                // 재검 제외는 상담 안내 문구(재검가능성·재검(사)안내·재검(사)필요·재검사진행)를
                // 걷어낸 뒤 검사한다 — 신규 예약 메모의 재검 언급 오탐 방지
                .contains("N'재검가능성', ''")
                .contains("N'재검사안내', ''")
                .contains("N'재검필요', ''")
                .contains("NOT LIKE '%재검%'")
                .contains("ORDER BY r.InsertedDateTime, r.RESERVE_NUM")
                .doesNotContain("OPENQUERY", "__OQ_");
    }

    @Test
    void reservation_list_sql은_TMDB_CRM_MEMO_순으로_내원동기를_뽑는다() {
        String sql = SqlLoader.load(ReservationListRepository.RESERVATION_LIST_SQL);

        assertThat(sql)
                // 텔레매니저 TM 배정 DB(모두닥 이벤트) 가 최우선 — 2026-07 실측 5건 누락 보완
                .contains("FROM DB_CUSTOM d WITH(NOLOCK)")
                .contains("LIKE N'%모두닥%'")
                .contains("CASE WHEN tmdb.hit = 1 THEN N'모두닥'")
                .contains("CASE WHEN tmdb.hit = 1 THEN 'TMDB'")
                .contains("WHEN ISNULL(mv.motiveM, '') <> '' THEN 'CRM'")
                .contains("WHEN ISNULL(resolvedMemoMv.motiveM, '') <> '' THEN 'MEMO'")
                .contains("CHARINDEX(N'TM고객(', r.COMMENT)")
                .contains("CHARINDEX(N'CTI고객(', r.COMMENT)")
                .contains("CHARINDEX(N'모두닥', ISNULL(r.COMMENT, '')) > 0 THEN N'모두닥'")
                .contains("CHARINDEX(N'크리에이트립', ISNULL(r.COMMENT, '')) > 0 THEN N'크리에이트립'")
                .contains("CHARINDEX(LTRIM(RTRIM(e.EMP_NAME)) + N't 소개'")
                .contains("CHARINDEX(N'직원소개', ISNULL(r.COMMENT, '')) > 0")
                .contains("THEN N'소개직원'")
                .contains("THEN staffReferral.employeeName")
                .contains("CHARINDEX(N'소개고객', ISNULL(r.COMMENT, '')) > 0 THEN N'소개미확인'")
                .contains("CHARINDEX(N'소개고객', ISNULL(r.COMMENT, '')) > 0 THEN N'소개고객'")
                .contains("THEN memoMv.motiveM ELSE fallbackMv.motiveM END");
    }

    @Test
    void kakao_count_sql은_happytalk_기준과_named_parameter를_보존한다() {
        String sql = SqlLoader.load(ReservationListRepository.KAKAO_COUNT_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("COUNT(DISTINCT CONVERT(VARCHAR(23), H.InsertedDateTime, 21))")
                .contains("HappyTalk_Counsel_List")
                .contains("HappyTalk_Category01")
                .contains("HappyTalk_Category02")
                .contains("C01.Name = '수술전'")
                .contains("C02.NAME = '★신환'")
                .doesNotContain("OPENQUERY", "__OQ_");
    }
}
