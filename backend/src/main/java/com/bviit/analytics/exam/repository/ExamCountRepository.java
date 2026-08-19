package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlFragments;
import com.bviit.analytics.common.util.SqlLoader;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 고객분류별 검사수(월간 레포트 도표 #7) — (월 × 내원동기(레포트)) 집계.
 * 모집단은 sql/fragments/exam-session-source.sql 공유라 검사수 도표·검사자 리스트와 정합한다.
 * 분류 규칙은 find-all-exam-list.sql 의 motiveReport 와 동일.
 */
@Repository
@Profile("postgres-mart")
public class ExamCountRepository {

    private static final String FIND_EXAM_COUNT_BY_CLASS_MONTHLY_SQL = "sql/exam/find-exam-count-by-class-monthly.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String findExamCountByClassMonthlySql;

    public ExamCountRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.findExamCountByClassMonthlySql = SqlLoader.load(FIND_EXAM_COUNT_BY_CLASS_MONTHLY_SQL)
                .replace("__EXAM_SESSION_SOURCE__", SqlFragments.examSessionSource());
    }

    /** 고객분류별 검사수 — (월 × 내원동기(레포트)) 집계. 월간 레포트 도표 #7. */
    public List<Map<String, Object>> findExamCountByClassMonthly(String from, String to) {
        return jdbc.queryForList(findExamCountByClassMonthlySql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
