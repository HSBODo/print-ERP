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
 * 예약 종합(콜, 온라인) 통계 쿼리.
 *
 * ⚠️ 레거시 BCRM '문의통계(RSS)' 종합값(콜+홈페이지+네이버+카톡, 등록일 기준, 콜센터 MySQL·네이버·해피톡
 * 다중 소스)은 운영 MSSQL 단독으로 재현 불가. 여기서는 **추정치**로, 검사예약(RESERVATION
 * RESERVE_FLAG='M' + 검사류 RESERVE_JINRYO)을 채널별(콜 + 온라인)로 **등록일(InsertedDateTime) 기준** 집계한다.
 *
 * 온라인 = RESERVE_PATH ONLINE/APP/NAVER. 콜·온라인 공통 junk(중복/재검/시뮬/차트있음/B2B) 제외 적용.
 * **카카오(해피톡)는 종합에 미포함** — 레거시 RSS가 월마다 카카오를 포함/미포함이 들쭉날쭉해(예: 2026-05는 미포함
 * =1,153, 2월은 포함≈1,892) 일관성을 위해 제외한다. 레거시 화면이 채널마다 다른 원천·정의·날짜축을 섞어 쓰므로
 * 월별 잔차는 남으며 당월까지만 신뢰.
 *
 * READ-ONLY — SELECT만 실행.
 */
@Repository
@Profile("postgres-mart")
public class ReservationOverallStatsRepository {

    static final String MONTHLY_SQL = "sql/softcrm/reservation/overall/select-monthly.sql";
    static final String MONTHLY_NAVER_SQL = "sql/softcrm/reservation/overall/select-monthly-naver.sql";
    static final String MONTHLY_KAKAO_SQL = "sql/softcrm/reservation/overall/select-monthly-kakao.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String monthlySql;
    private final String monthlyNaverSql;
    private final String monthlyKakaoSql;

    public ReservationOverallStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.monthlySql = SqlLoader.load(MONTHLY_SQL);
        this.monthlyNaverSql = SqlLoader.load(MONTHLY_NAVER_SQL);
        this.monthlyKakaoSql = SqlLoader.load(MONTHLY_KAKAO_SQL);
    }

    /**
     * 월별 검사예약 종합·온라인·콜(추정치). 레거시 RSS 화면(uSTATISTICSD1) 정의에 맞춰 보정.
     *
     *   공통 제외   = B2B(군인)·재검·중복·시뮬·차트있음 예약(RESERVE_SEQ '8'=B2B군인·'5'=재검, COMMENT 매칭)을
     *                WHERE 절에서 콜·온라인 양 채널에 일괄 제외(2026-06 통일).
     *   call_cnt   = 콜 채널(RESERVE_PATH CTI=인콜·CRM=아웃콜).
     *   online_cnt = 온라인 채널(ONLINE/APP=홈페이지·NAVER=네이버). 2026부터 네이버=RESERVE_PATH='NAVER'.
     *   cnt(종합)   = 콜 + 온라인 (경로가 상호배타이므로 union DISTINCT = 두 채널 합). **카카오 미포함**(클래스 주석 참고).
     *
     * ⚠️ 집계 기준은 예약일이 아니라 **등록일(InsertedDateTime)** — RSS 화면이 등록일로 집계하기 때문.
     * 등록일은 미래 불가라 당월까지 자연 완결, 이후 월은 행이 없어 null.
     */
    public List<Map<String, Object>> findReservationOverallMonthly(String from, String to) {
        return jdbc.queryForList(monthlySql, params(from, to));
    }

    /**
     * 월별 네이버 예약수 — 예약통계_시력교정(RSS)의 '네이버 예약수'와 동일 기준(취소 제외, 정크제외 미적용).
     * 2026-01 부터의 온라인 예약 재정의(네이버+카카오톡+홈페이지)에 쓴다.
     *
     * ⚠️ {@link #findReservationOverallMonthly} 의 online_cnt 안에 있는 NAVER 집계와 값이 다르다.
     * 기준이 다른 게 의도다 — 맞추려 하지 말 것(SQL 주석 참고).
     */
    public List<Map<String, Object>> findNaverMonthly(String from, String to) {
        return jdbc.queryForList(monthlyNaverSql, params(from, to));
    }

    /**
     * 월별 카카오톡 예약수 — 해피톡('수술전' + '★신환') 기준. RESERVATION 이 아니라 별도 원천이다.
     * 2026-01 이전(2024·2025) 종합에는 카카오가 의도적으로 빠져 있었다(클래스 주석 참고).
     */
    public List<Map<String, Object>> findKakaoMonthly(String from, String to) {
        return jdbc.queryForList(monthlyKakaoSql, params(from, to));
    }

    private MapSqlParameterSource params(String from, String to) {
        return new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to);
    }
}
