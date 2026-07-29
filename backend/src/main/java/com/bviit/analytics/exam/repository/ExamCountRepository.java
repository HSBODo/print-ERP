package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlLoader;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Map;

/**
 * 검사수(월간 레포트 c-exam-count) 범위 집계 — EXAM 행수 + Cataract_Exam 세션수 (원시 COUNT).
 * 전체 검사자 리스트의 "조회건수(사람)" 옆에 참고용 "검사수(세션)"를 표시하기 위한 읽기 전용 조회.
 */
@Repository
@Profile({"mssql", "postgres-mart"})
public class ExamCountRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String FIND_EXAM_COUNT_RANGE_SQL = "sql/exam/find-exam-count-range.sql";

    private final String findExamCountRangeSql;

    public ExamCountRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.findExamCountRangeSql = SqlLoader.load(FIND_EXAM_COUNT_RANGE_SQL);
    }

    public Map<String, Object> findExamCountRange(String from, String to) {
        return jdbc.queryForMap(findExamCountRangeSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
