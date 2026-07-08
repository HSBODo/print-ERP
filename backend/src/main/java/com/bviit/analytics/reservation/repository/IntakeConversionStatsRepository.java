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
 * 유입(검사예약) 통계 쿼리.
 *
 * 현재 DB에서 식별 가능한 유입 채널만 보수적으로 매핑한다.
 *   CTI    -> 인콜
 *   CRM    -> 아웃콜/CRM 직접 입력
 *   KAKAO  -> 카카오톡
 *   NAVER  -> 네이버
 *   ONLINE, APP -> 홈페이지
 *
 * MSSQL 2014 호환: STRING_AGG, TRIM 등 최신 함수 사용 금지.
 * READ-ONLY — SELECT만 실행.
 */
@Repository
@Profile({"mssql", "postgres-mart"})
public class IntakeConversionStatsRepository {

    static final String MONTHLY_SQL = "sql/intake-conversion/monthly.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String monthlySql;

    public IntakeConversionStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.monthlySql = SqlLoader.load(MONTHLY_SQL);
    }

    public List<Map<String, Object>> findMonthlyStats(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", minYear + "-01-01")
                .addValue("to", maxYear + "-12-31");

        return jdbc.queryForList(monthlySql, params);
    }
}
