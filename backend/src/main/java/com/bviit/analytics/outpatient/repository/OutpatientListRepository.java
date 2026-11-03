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
 * 외래수 리스트 — RESERVATION 기준 외래(F) + 내원/퇴원(I/H) 행 목록.
 *
 * 종합 카운트({@code select-outpatient-count-monthly.sql})와 같은 필터를 사용해
 * 리스트 합계가 월별 외래수 지표와 정합한다. RESERVATION + CUSTOM + EMPLOYEE(×3)
 * + MEDICAL_SUB_CFG + MOTIVE_NEW02 등을 JOIN한 비측정 행.
 *
 * 컬럼 별칭(camelCase)이 그대로 JSON 키가 되어 프론트 Zod 스키마와 1:1 매칭된다 — DTO 불필요.
 * 모든 컬럼은 COALESCE(...,'')로 감싸 항상 문자열을 보장한다.
 *
 * READ-ONLY · Postgres · 날짜는 char(10) 'YYYY-MM-DD'.
 */
@Repository
@Profile("postgres-mart")
public class OutpatientListRepository {

    static final String SQL = "sql/warehouse/outpatient/select-outpatient-list.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String findOutpatientListSql;

    public OutpatientListRepository(
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc
    ) {
        this.jdbc = warehouseJdbc;
        this.findOutpatientListSql = SqlLoader.load(SQL);
    }

    public List<Map<String, Object>> findOutpatientList(String from, String to) {
        return jdbc.queryForList(findOutpatientListSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
