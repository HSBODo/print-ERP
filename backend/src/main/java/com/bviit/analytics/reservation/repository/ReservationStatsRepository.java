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
 * RESERVATION 테이블 기반 예약 월별 집계 쿼리.
 * MSSQL 2014 호환: STRING_AGG, TRIM 등 사용 금지.
 * READ-ONLY — SELECT만 실행.
 * postgres-mart 프로파일에서만 활성화 — H2 기본 부팅 시 빈 생성 안 됨.
 */
@Repository
@Profile("postgres-mart")
public class ReservationStatsRepository {

    static final String MONTHLY_BY_TYPE_SQL = "sql/softcrm/reservation/select-monthly-by-type.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String monthlyByTypeSql;

    public ReservationStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.monthlyByTypeSql = SqlLoader.load(MONTHLY_BY_TYPE_SQL);
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
}
