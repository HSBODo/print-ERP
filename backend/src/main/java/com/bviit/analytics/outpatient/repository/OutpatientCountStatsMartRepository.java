package com.bviit.analytics.outpatient.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

/**
 * 외래 마트 read 전용 리포지토리.
 *
 * outpatient_count/total은 nullable — ResultSet.getObject로 읽어 Integer(null 유지).
 * 서비스 계약과 동일하게 null을 그대로 반환한다.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OutpatientCountStatsMartRepository {

    private static final String SELECT_MONTHLY_SQL = SqlLoader.load("sql/mart/outpatient/select-outpatient-count-monthly.sql");
    private static final String SELECT_OUTPATIENT_DAILY_AGG_SQL = SqlLoader.load("sql/mart/outpatient/select-outpatient-daily-agg.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<OutpatientCountMonthlyItem> findMonthly(List<Integer> years) {
        return jdbc.query(
                SELECT_MONTHLY_SQL,
                new MapSqlParameterSource("years", years),
                (rs, i) -> OutpatientCountMonthlyItem.builder()
                        .year(rs.getInt("yr"))
                        .month(rs.getInt("mo"))
                        .outpatientCount(nullableInt(rs, "outpatientCount"))
                        .total(nullableInt(rs, "total"))
                        .build()
        );
    }

    /**
     * 외래수 일별 집계 — list_outpatient(= 외래수 리스트) 하나에서 뽑는다.
     * 월별은 월로, 주차는 ISO 주차로 각자 접어 쓴다. 두 축이 같은 행에서 나오므로 어긋날 수 없다.
     *
     * ⚠️ 리스트가 적재된 뒤에 호출해야 한다. 배치에서는 list_outpatient 적재 이후 단계.
     */
    public List<Map<String, Object>> findOutpatientDailyAgg(String from, String to) {
        return jdbc.queryForList(
                SELECT_OUTPATIENT_DAILY_AGG_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
        );
    }

    private static Integer nullableInt(ResultSet rs, String col) throws SQLException {
        int v = rs.getInt(col);
        return rs.wasNull() ? null : v;
    }
}
