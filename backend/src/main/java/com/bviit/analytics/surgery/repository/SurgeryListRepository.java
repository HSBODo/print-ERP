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
 * MSSQL 2014 호환: STRING_AGG, TRIM 사용 금지.
 */
@Repository
@Profile({"mssql", "postgres-mart"})
public class SurgeryListRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String FIND_SURGERY_LIST_SQL = "sql/surgery/find-surgery-list.sql";

    private final String findSurgeryListSql;

    public SurgeryListRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.findSurgeryListSql = SqlLoader.load(FIND_SURGERY_LIST_SQL);
    }

    public List<Map<String, Object>> findSurgeryList(String from, String to) {
        String sql = findSurgeryListSql;

        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
