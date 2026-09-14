package com.bviit.analytics.surgery.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 누적 안수 — MSSQL 원천 직결 조회. 배치(적재)에서만 사용.
 *
 * <p>화면은 마트({@link AccumulatedEyeMartRepository})를 읽는다. 이 리포지토리는
 * {@link com.bviit.analytics.batch.job.AccumulatedEyeMartJob} 가 D-1/monthly-reconcile 재적재 시에만 호출.
 */
@Repository
@Profile("postgres-mart")
public class AccumulatedEyeSourceRepository {

    private static final String SELECT_SQL = SqlLoader.load("sql/softcrm/surgery/select-accumulated-eyes.sql");

    private final NamedParameterJdbcTemplate jdbc;

    public AccumulatedEyeSourceRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    /** from..to (operation_date 반개구간) 원천 조회. camelCase 별칭 그대로 반환 — Writer 가 :바인딩. */
    public List<Map<String, Object>> findRange(String from, String to) {
        return jdbc.queryForList(
                SELECT_SQL,
                new MapSqlParameterSource()
                        .addValue("from", from)
                        .addValue("to", to)
        );
    }
}
