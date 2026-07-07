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
 * 전체 검사자 리스트 mart read.
 *
 * list_exam + list_cataract_exam 를 UNION ALL 로 합쳐 반환.
 * 파생 필드(introType, jobBucket)는 SQL의 CASE 로 재분류.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class AllExamListMartRepository {

    private static final String SELECT_SQL = SqlLoader.load("sql/mart/select-all-exam-list.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<Map<String, Object>> findAllExamList(String from, String to) {
        return jdbc.queryForList(
                SELECT_SQL,
                new MapSqlParameterSource()
                        .addValue("from", from)
                        .addValue("to", to)
        );
    }
}
