package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * RESERVATION 테이블 기반 예약 통계 쿼리.
 * MSSQL 2014 호환: STRING_AGG, TRIM 등 사용 금지.
 * READ-ONLY — SELECT만 실행.
 * mssql 프로파일에서만 활성화 — H2 기본 부팅 시 빈 생성 안 됨.
 */
@Repository
@Profile("postgres-mart")
public class ReservationStatsRepository {

    static final String SUMMARY_SQL = "sql/reservation/summary.sql";
    static final String DAILY_TREND_SQL = "sql/reservation/daily-trend.sql";
    static final String SOURCE_BREAKDOWN_SQL = "sql/reservation/source-breakdown.sql";
    static final String MONTHLY_BY_TYPE_SQL = "sql/reservation/monthly-by-type.sql";
    static final String HOURLY_DISTRIBUTION_SQL = "sql/reservation/hourly-distribution.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String summarySql;
    private final String dailyTrendSql;
    private final String sourceBreakdownSql;
    private final String monthlyByTypeSql;
    private final String hourlyDistributionSql;

    public ReservationStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.summarySql = SqlLoader.load(SUMMARY_SQL);
        this.dailyTrendSql = SqlLoader.load(DAILY_TREND_SQL);
        this.sourceBreakdownSql = SqlLoader.load(SOURCE_BREAKDOWN_SQL);
        this.monthlyByTypeSql = SqlLoader.load(MONTHLY_BY_TYPE_SQL);
        this.hourlyDistributionSql = SqlLoader.load(HOURLY_DISTRIBUTION_SQL);
    }

    private MapSqlParameterSource dateParams(String from, String to) {
        return new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to);
    }

    /**
     * 요약: 전체 예약, 검사 완료(FLAG=F), 취소, 당일 예약
     */
    public Map<String, Object> findSummary(String from, String to) {
        return jdbc.queryForMap(summarySql, dateParams(from, to));
    }

    /**
     * 이전 기간 요약 (변화율 계산용)
     */
    public Map<String, Object> findPrevSummary(String prevFrom, String prevTo) {
        return findSummary(prevFrom, prevTo);
    }

    /**
     * 일별 추이: 예약/검사/취소
     */
    public List<Map<String, Object>> findDailyTrend(String from, String to) {
        return jdbc.queryForList(dailyTrendSql, dateParams(from, to));
    }

    /**
     * 유입 채널별 건수.
     * RESERVE_PATH 매핑:
     *   CTI → phone, NAVER → naver, KAKAO → kakao,
     *   TODAY_FLAG='Y' → walkIn (별도 집계),
     *   나머지(CRM, APP, ONLINE, EMR, Kiosk 등) → referral(기타)
     */
    public List<Map<String, Object>> findSourceBreakdown(String from, String to) {
        return jdbc.queryForList(sourceBreakdownSql, dateParams(from, to));
    }

    /**
     * 월별 수술/외래/드림렌즈 건수 (연도 목록 기준).
     * RESERVE_FLAG: O=수술, D=드림렌즈
     * RESERVE_JINRYO: 2=외래
     */
    public List<Map<String, Object>> findMonthlyByType(List<Integer> years) {
        // JTDS 호환: YEAR() IN (:param)이 테이블 힌트로 오인됨 → 날짜 범위로 우회
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String fromDate = minYear + "-01-01";
        String toDate = maxYear + "-12-31";

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", fromDate)
                .addValue("to", toDate);

        return jdbc.queryForList(monthlyByTypeSql, params);
    }

    /**
     * 시간대별 분포 (1시간 단위, 08~19시)
     * START_TIME 형식: 'HH:mm'
     */
    public List<Map<String, Object>> findHourlyDistribution(String from, String to) {
        return jdbc.queryForList(hourlyDistributionSql, dateParams(from, to));
    }
}
