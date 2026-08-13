package com.bviit.analytics.surgery.repository;

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
 * 재수술 후보 마트 read 전용 — list_reoperation 조회.
 *
 * 배치(SurgeryMartJob)가 매일 delete+insert 하며 auto_included·exclude_reason 까지 이미 계산돼 있어
 * 컨트롤러 계약(ReoperationCandidate) 필드와 1:1 매핑된다.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReoperationCandidateMartRepository {

    private static final String SELECT_SQL = SqlLoader.load("sql/mart/select-reoperation-candidates.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<Map<String, Object>> findCandidates(String from, String to) {
        return jdbc.queryForList(
                SELECT_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
        );
    }
}
