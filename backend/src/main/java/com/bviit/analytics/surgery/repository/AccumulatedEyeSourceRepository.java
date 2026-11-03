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
 * 누적 안수 원천 직결 조회 — {@link com.bviit.analytics.batch.job.AccumulatedEyeMartJob} 의 배치 read-side.
 *
 * <p>화면은 마트({@link AccumulatedEyeMartRepository})를 읽는다. 이 리포지토리는
 * D-1/monthly-reconcile 재적재 시에만 호출.
 */
@Repository
@Profile("postgres-mart")
public class AccumulatedEyeSourceRepository {

    static final String SQL = "sql/warehouse/surgery/select-accumulated-eyes.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String selectSql;

    public AccumulatedEyeSourceRepository(
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc
    ) {
        this.jdbc = warehouseJdbc;
        this.selectSql = SqlLoader.load(SQL);
    }

    /** from..to (operation_date 반개구간) 원천 조회. camelCase 별칭 그대로 반환 — Writer 가 :바인딩. */
    public List<Map<String, Object>> findRange(String from, String to) {
        return jdbc.queryForList(
                selectSql,
                new MapSqlParameterSource()
                        .addValue("from", from)
                        .addValue("to", to)
        );
    }
}
