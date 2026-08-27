package com.bviit.analytics.surgery.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.surgery.dto.AccumulatedEyeRow;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 누적 안수 리스트 — 화면 조회용 마트 read.
 *
 * <p>배치가 채운 {@code list_accumulated_eyes} 를 읽는다. 소스(MSSQL) 가 끊겨도
 * 마지막 적재분으로 화면이 살아 있다 — 다른 마트 도메인과 동일한 원칙.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class AccumulatedEyeMartRepository {

    private static final String SELECT_SQL = SqlLoader.load("sql/mart/surgery/select-list-accumulated-eyes.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    /**
     * 총 누적 안수 — 마트 max(accumulated_eye_count). 비활성 행은 제외.
     * 홈 대시보드 KPI 카드에서 씀. 원본 배치가 단조 증가로 관리하므로 max 값이 곧 전체 총계.
     */
    public long findTotal() {
        Long total = jdbc.getJdbcOperations().queryForObject(
                "SELECT COALESCE(MAX(accumulated_eye_count), 0) FROM list_accumulated_eyes WHERE is_active = TRUE",
                Long.class
        );
        return total == null ? 0L : total;
    }

    public List<AccumulatedEyeRow> findList(String from, String to, String query, String field) {
        return jdbc.query(
                SELECT_SQL,
                new MapSqlParameterSource()
                        .addValue("from", from)
                        .addValue("to", to)
                        .addValue("query", query == null ? "" : query.trim())
                        .addValue("field", (field == null || field.isBlank()) ? "all" : field),
                (rs, i) -> AccumulatedEyeRow.builder()
                        .id(rs.getString("id"))
                        .custNum(String.valueOf(rs.getLong("custNum")))
                        .customName(rs.getString("customName"))
                        .customPhone(rs.getString("customPhone"))
                        .operationCategory(rs.getString("operationCategory"))
                        .operationCode(rs.getString("operationCode"))
                        .operationDate(rs.getString("operationDate"))
                        .accumulatedEyeCount(rs.getLong("accumulatedEyeCount"))
                        .eyePosition(rs.getString("eyePosition"))
                        .createDate(rs.getString("createDate"))
                        .lastModifiedDate(rs.getString("lastModifiedDate"))
                        .build()
        );
    }
}
