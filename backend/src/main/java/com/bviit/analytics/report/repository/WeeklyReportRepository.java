package com.bviit.analytics.report.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 주차 레포트 전용 일별 집계 쿼리 (운영 DB 직결).
 *
 * <p>여기 있는 SQL 은 모두 기존 <b>월별 SQL 의 일별 버전</b>이다 — WHERE 절은 그대로 두고 버킷만
 * 월→일로 바꿨다. 서비스가 이 일별 행을 ISO 주차로 다시 묶는다.
 *
 * <p><b>동기화 책임</b> — 원본 월별 SQL 을 고치면 짝이 되는 일별 SQL 도 같이 고쳐야 한다.
 * 각 .sql 파일 머리말에 원본 경로를 적어 두었다.
 *
 * <p>이미 일별 소스가 있는 지표는 여기서 중복하지 않고 기존 리포지터리를 재사용한다:
 * 검사 유입·시력교정 검사·원데이·중단 → {@code OverallExamWeeklyRepository},
 * 수술 3종 → {@code SurgeryStatsService.getDailyStats}.
 */
@Repository
@Profile({"mssql", "postgres-mart"})
public class WeeklyReportRepository {

    private static final String RESERVATION_OVERALL_DAILY_SQL = "sql/report/find-reservation-overall-daily.sql";
    private static final String RESERVATION_NAVER_DAILY_SQL   = "sql/report/find-reservation-naver-daily.sql";
    private static final String RESERVATION_KAKAO_DAILY_SQL   = "sql/report/find-reservation-kakao-daily.sql";
    private static final String CATARACT_EXAM_DAILY_SQL       = "sql/report/find-cataract-exam-daily.sql";
    private static final String OUTPATIENT_DAILY_SQL          = "sql/report/find-outpatient-daily.sql";
    private static final String VISION_RATES_DAILY_SQL        = "sql/report/find-vision-rates-daily.sql";

    private final NamedParameterJdbcTemplate jdbc;

    private final String reservationOverallDailySql;
    private final String reservationNaverDailySql;
    private final String reservationKakaoDailySql;
    private final String cataractExamDailySql;
    private final String outpatientDailySql;
    private final String visionRatesDailySql;

    public WeeklyReportRepository(@Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.reservationOverallDailySql = SqlLoader.load(RESERVATION_OVERALL_DAILY_SQL);
        this.reservationNaverDailySql = SqlLoader.load(RESERVATION_NAVER_DAILY_SQL);
        this.reservationKakaoDailySql = SqlLoader.load(RESERVATION_KAKAO_DAILY_SQL);
        this.cataractExamDailySql = SqlLoader.load(CATARACT_EXAM_DAILY_SQL);
        this.outpatientDailySql = SqlLoader.load(OUTPATIENT_DAILY_SQL);
        this.visionRatesDailySql = SqlLoader.load(VISION_RATES_DAILY_SQL);
    }

    /** 예약 종합 일별 — d, cnt, online_cnt, call_cnt (등록일 InsertedDateTime 기준). */
    public List<Map<String, Object>> findReservationOverallDaily(String from, String to) {
        return query(reservationOverallDailySql, from, to);
    }

    /** 네이버 예약 일별 — d, naver_cnt (RSS 기준). */
    public List<Map<String, Object>> findReservationNaverDaily(String from, String to) {
        return query(reservationNaverDailySql, from, to);
    }

    /** 카카오톡 예약 일별 — d, kakao_cnt (해피톡). */
    public List<Map<String, Object>> findReservationKakaoDaily(String from, String to) {
        return query(reservationKakaoDailySql, from, to);
    }

    /** 백내장 검사수 일별 — d, cnt (RESERVATION H 기준, 사람 단위). */
    public List<Map<String, Object>> findCataractExamDaily(String from, String to) {
        return query(cataractExamDailySql, from, to);
    }

    /** 외래수 일별 — d, cnt (RESERVATION F + STATE I/H). */
    public List<Map<String, Object>> findOutpatientDaily(String from, String to) {
        return query(outpatientDailySql, from, to);
    }

    /** 시력교정 상담 지표 일별 — d, examGeneral, bookedGeneral 등 (EXAM 기준). */
    public List<Map<String, Object>> findVisionRatesDaily(String from, String to) {
        return query(visionRatesDailySql, from, to);
    }

    private List<Map<String, Object>> query(String sql, String from, String to) {
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
