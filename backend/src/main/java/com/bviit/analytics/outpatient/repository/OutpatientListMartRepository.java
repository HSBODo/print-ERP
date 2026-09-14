package com.bviit.analytics.outpatient.repository;

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
 * 외래수 리스트 마트 read 전용 리포지토리.
 *
 * 대상 테이블:
 *   - list_outpatient — 외래(F) + I/H 행 명단 (39필드 계약)
 *
 * 반환 shape은 기존 MSSQL 직결 결과(select-outpatient-list.sql)와 동일. 컷오버 후 컨트롤러/UI 영향 없음.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OutpatientListMartRepository {

    private static final String SELECT_LIST_OUTPATIENT_SQL = SqlLoader.load("sql/mart/outpatient/select-list-outpatient.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<Map<String, Object>> findOutpatientList(String from, String to) {
        return jdbc.queryForList(
                SELECT_LIST_OUTPATIENT_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
        );
    }
}
