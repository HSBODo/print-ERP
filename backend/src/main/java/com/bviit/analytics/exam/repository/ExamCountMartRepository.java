package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlLoader;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 고객분류별 검사수 mart read — mart_exam_count_by_class 조회.
 * 응답 shape 은 MSSQL 직결(find-exam-count-by-class-monthly.sql)과 동일하다.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ExamCountMartRepository {

    private static final String SELECT_SQL = SqlLoader.load("sql/mart/select-exam-count-by-class.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<Map<String, Object>> findExamCountByClassMonthly(int year) {
        return jdbc.queryForList(SELECT_SQL, new MapSqlParameterSource().addValue("year", year));
    }
}
