package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.config.EoeisDataSourceConfig;
import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.exam.dto.EoeisCheckupRow;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** EyeReader.checkup_record 읽기 전용 집계. 모든 기간값은 바인딩한다. */
@Repository
@ConditionalOnExpression(EoeisDataSourceConfig.ENABLED_EXPRESSION)
public class EoeisCheckupRepository {

    private static final String STATS_SQL = SqlLoader.load("sql/eoeis/find-checkup-stats.sql");
    private static final String SCORES_SQL = SqlLoader.load("sql/eoeis/find-device-scores.sql");

    private final NamedParameterJdbcTemplate jdbc;

    public EoeisCheckupRepository(
            @Qualifier("eoeisJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    public List<EoeisCheckupRow> findStats(LocalDate from, LocalDate to) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", Date.valueOf(from))
                .addValue("toExclusive", Date.valueOf(to.plusDays(1)));
        return jdbc.query(STATS_SQL, params, (rs, rowNum) -> new EoeisCheckupRow(
                rs.getString("operator_name"),
                rs.getString("device_name"),
                rs.getDate("record_date").toLocalDate(),
                rs.getLong("checkup_count")
        ));
    }

    public Map<String, Integer> findScores() {
        Map<String, Integer> scores = new LinkedHashMap<>();
        jdbc.query(SCORES_SQL, (RowCallbackHandler) rs ->
                scores.put(rs.getString("device_name"), rs.getInt("score")));
        return scores;
    }
}
