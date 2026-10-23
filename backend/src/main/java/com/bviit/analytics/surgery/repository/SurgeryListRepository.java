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
 * 수술자 리스트 — 실제 수술일 기준 행 목록.
 *
 * 기준일: 수술일자(OPERATIONDATA.OPERATION_DATE, Cataract_Operationdata R/L 수술일)
 * 보조일: 검사일자(EXAM.EXAM_DATE, Cataract_Exam.EXAM_DATE)
 *
 */
@Repository
@Profile("postgres-mart")
public class SurgeryListRepository {

    static final String SQL = "sql/warehouse/surgery/select-surgery-list.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String findSurgeryListSql;

    public SurgeryListRepository(
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc
    ) {
        this.jdbc = warehouseJdbc;
        this.findSurgeryListSql = SqlLoader.load(SQL);
    }

    public List<Map<String, Object>> findSurgeryList(String from, String to) {
        return jdbc.queryForList(findSurgeryListSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
