package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlLoader;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Map;

/**
 * 검사수 범위 집계 — 마트 원시 COUNT (필터·세션합 없음).
 *
 * <p>전체 검사자 리스트의 "조회건수(사람)" 옆 참고 지표. 소스는 postgres 마트
 * (list_exam + list_cataract_exam) 만 사용 — MSSQL 직결 없음.
 *
 * <p>2026-07-15 브랜치의 무필터 COUNT 로직을 마트 DB 로 이관한 것.
 */
@Repository
@Profile("postgres-mart")
public class ExamCountRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_EXAM_COUNT_RANGE_SQL = "sql/mart/select-exam-count-range.sql";

    private final String selectExamCountRangeSql;

    public ExamCountRepository(
            @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.selectExamCountRangeSql = SqlLoader.load(SELECT_EXAM_COUNT_RANGE_SQL);
    }

    public Map<String, Object> findExamCountRange(String from, String to) {
        return jdbc.queryForMap(selectExamCountRangeSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
