package com.bviit.analytics.outpatient.repository;

import com.bviit.analytics.common.util.SqlLoader;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 외래수 통계 쿼리. OutpatientReconcileService 전용(파이프라인 밖, 대사용).
 *
 * 운영 기준(레거시 차트와 최근접): 외래 예약(`RESERVE_FLAG='F'`) 중 내원/퇴원 처리된
 * (`RESERVE_STATE IN ('I','H')`) 행 수. 사람 단위가 아니라 **행 수**(`COUNT(*)`).
 *
 * READ-ONLY — SELECT 만 실행. 날짜 컬럼은 varchar(YYYY-MM-DD).
 */
@Repository
@Profile("postgres-mart")
public class OutpatientCountStatsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    static final String FIND_OUTPATIENT_COUNT_MONTHLY_SQL = "sql/warehouse/outpatient/select-outpatient-count-monthly.sql";

    private final String findOutpatientCountMonthlySql;

    public OutpatientCountStatsRepository(
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc
    ) {
        this.jdbc = warehouseJdbc;
        this.findOutpatientCountMonthlySql = SqlLoader.load(FIND_OUTPATIENT_COUNT_MONTHLY_SQL);
    }

    /** 월별 외래수 = RESERVATION F + 내원/퇴원(I/H) 행 수. */
    public List<Map<String, Object>> findOutpatientCountMonthly(String from, String to) {
        String sql = findOutpatientCountMonthlySql;
        return jdbc.queryForList(sql, params(from, to));
    }

    private MapSqlParameterSource params(String from, String to) {
        return new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to);
    }
}
