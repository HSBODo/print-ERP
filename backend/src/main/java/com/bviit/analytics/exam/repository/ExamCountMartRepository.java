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
 * 고객분류별 검사수 mart read — mart_exam_count_by_class 조회 + list 재집계.
 * 응답 shape 은 MSSQL 직결(select-exam-count-by-class-monthly.sql)과 동일하다.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ExamCountMartRepository {

    private static final String SELECT_SQL = SqlLoader.load("sql/mart/select-exam-count-by-class.sql");
    private static final String AGGREGATE_FROM_LIST_SQL =
            SqlLoader.load("sql/mart/select-exam-count-by-class-monthly-agg.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<Map<String, Object>> findExamCountByClassMonthly(int year) {
        return jdbc.queryForList(SELECT_SQL, new MapSqlParameterSource().addValue("year", year));
    }

    /**
     * v_all_exam_list 를 (yr, month, motive_report) 로 접어 계산 — MSSQL 접근 없음.
     * ReportMartJob 이 mart_exam_count_by_class 를 upsert 할 때 이 결과를 그대로 쓴다.
     * 반환 shape 은 MSSQL 원본과 동일: {month:int, motiveReport:String, cnt:int}.
     */
    public List<Map<String, Object>> aggregateFromList(int year) {
        return jdbc.queryForList(AGGREGATE_FROM_LIST_SQL, new MapSqlParameterSource().addValue("year", year));
    }
}
