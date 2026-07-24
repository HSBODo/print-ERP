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
 * 재수술 후보 — RE_OPERATION 원본 행 + 자동판정(포함/제외)·제외사유.
 *
 * 기준일: 재수술일(RE_OPERATION.REOP_DATE)
 * 제외 규칙은 월간 레포트 재수술 집계(find-reoperation-monthly.sql)와 동일하게 유지한다.
 *
 * MSSQL 2014 호환: STRING_AGG, TRIM 사용 금지.
 */
@Repository
@Profile({"mssql", "postgres-mart"})
public class ReoperationCandidateRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String FIND_REOPERATION_CANDIDATES_SQL = "sql/surgery/find-reoperation-candidates.sql";

    private final String findReoperationCandidatesSql;

    public ReoperationCandidateRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.findReoperationCandidatesSql = SqlLoader.load(FIND_REOPERATION_CANDIDATES_SQL);
    }

    public List<Map<String, Object>> findCandidates(String from, String to) {
        return jdbc.queryForList(findReoperationCandidatesSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
