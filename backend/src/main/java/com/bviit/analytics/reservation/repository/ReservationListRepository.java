package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 예약자 리스트 — "예약 종합(콜·온라인)" 월간 건수를 구성하는 검사예약 행 목록.
 *
 * ReservationOverallStatsRepository.findReservationOverallMonthly 의 RESERVATION 집계와 동일 정의(행 단위):
 *   - 검사예약: RESERVE_FLAG='M' + RESERVE_JINRYO IN ('','5','6','7','24','25')
 *   - 집계 기준 날짜: 등록일(InsertedDateTime) — RSS 화면이 등록일로 집계하기 때문(예약일 아님)
 *   - 채널: 콜(CTI=인콜·CRM=아웃콜) + 온라인(ONLINE·APP=홈페이지·NAVER=네이버)
 *   - 공통 제외: B2B군인·재검·중복·시뮬·차트있음(RESERVE_SEQ '8'/'5', COMMENT)을 **콜·온라인 양 채널에** 적용
 *     (예약 종합과 동일. 과거 온라인 미적용 시 중복예약이 월 12~54건 과대계상되던 것 보정 — 2026-06)
 *   - 제외: 테스트/TEST 이름, 공용 더미 고객 8888888888888 (CRM 플레이스홀더)
 *   - 상태(RESERVE_STATE) 필터 없음 — 종합은 등록 시점 기준이라 사후 취소도 포함.
 * 행 1개 = RESERVE_NUM 1개(PK). **명단 행 합계 = 예약 종합 월 값**(둘 다 카카오 미포함).
 * 카카오(countKakao)는 RESERVATION에 행이 없어(해피톡 소스) 명단·종합 모두 제외 → 화면에 참고용으로만 표시.
 *
 * READ-ONLY · MSSQL 2014 호환(TRIM 금지). 날짜 범위는 등록일(InsertedDateTime) 기준.
 */
@Repository
@Profile({"mssql", "postgres-mart"})
public class ReservationListRepository {

    static final String RESERVATION_LIST_SQL = "sql/reservation-list/reservation-list.sql";
    static final String RESERVATION_LIST_ALL_SQL = "sql/reservation-list/reservation-list-all.sql";
    static final String KAKAO_COUNT_SQL = "sql/reservation-list/kakao-count.sql";
    static final String KAKAO_DAILY_COUNTS_SQL = "sql/reservation-list/kakao-daily-counts.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String reservationListSql;
    private final String reservationListAllSql;
    private final String kakaoCountSql;
    private final String kakaoDailyCountsSql;

    public ReservationListRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.reservationListSql = SqlLoader.load(RESERVATION_LIST_SQL);
        this.reservationListAllSql = SqlLoader.load(RESERVATION_LIST_ALL_SQL);
        this.kakaoCountSql = SqlLoader.load(KAKAO_COUNT_SQL);
        this.kakaoDailyCountsSql = SqlLoader.load(KAKAO_DAILY_COUNTS_SQL);
    }

    public List<Map<String, Object>> findReservationList(String from, String to) {
        return jdbc.queryForList(reservationListSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }

    /**
     * 예약 전체 얇은 리스트 — mart_reservation_monthly(수술/외래/드림렌즈) 재집계용.
     * 검사(M) 예약은 여기서 빠진다 — RESERVE_FLAG='O' OR RESERVE_FLAG='D' OR RESERVE_JINRYO='2'.
     * 예약일(RESERVE_DATE) 기준. 취소(C) 제외.
     */
    public List<Map<String, Object>> findReservationListAll(String from, String to) {
        return jdbc.queryForList(reservationListAllSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }

    /**
     * 카카오(해피톡 대분류 '수술전' + 중분류 '★신환' = 레거시 RSS '카카오톡_예약') 건수 — 참고용.
     * 카카오 예약은 RESERVE_PATH가 없어 RESERVATION(=명단)엔 안 잡힌다. 예약 종합도 카카오를 빼므로
     * (레거시가 월마다 포함/미포함 불일치) 합산하지 않고 화면에 참고 수치로만 보여준다.
     * 등록일 기준 ms 단위 등록시각 distinct, 명단 행 범위와 같은 날짜창(< to+1일).
     */
    public int countKakao(String from, String to) {
        Integer count = jdbc.queryForObject(kakaoCountSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to), Integer.class);
        return count == null ? 0 : count;
    }

    /**
     * 카카오(해피톡) 일별 신규 신환 예약 건수 — 마트 배치 적재용.
     * 반환: [{dt: 'YYYY-MM-DD', kakaoCount: int}, ...] (해당 날짜에 건수가 있는 행만).
     */
    public List<Map<String, Object>> findKakaoDailyCounts(String from, String to) {
        return jdbc.queryForList(kakaoDailyCountsSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
