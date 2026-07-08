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

    private static final String SELECT_MONTHLY_SQL = SqlLoader.load("sql/mart/select-outpatient-count-monthly.sql");

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

    private static Integer nullableInt(ResultSet rs, String col) throws SQLException {
        int v = rs.getInt(col);
        return rs.wasNull() ? null : v;
    }
}
