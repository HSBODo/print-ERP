package com.bviit.analytics.batch.job;

import com.bviit.analytics.common.util.SqlLoader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Types;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 누적 안수 리스트 마트 write — range delete + batch insert.
 *
 * <p>다른 리스트 마트 Writer 와 동형(예약자 리스트_홈페이지 · 예약자 리스트 replaceList).
 * 소스 SELECT 별칭(camelCase) 을 그대로 :바인딩 파라미터로 넣는다.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class AccumulatedEyeMartWriter {

    private static final String DELETE_RANGE_SQL = SqlLoader.load("sql/mart/surgery/delete-list-accumulated-eyes-range.sql");
    private static final String INSERT_SQL       = SqlLoader.load("sql/mart/surgery/insert-list-accumulated-eyes.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    @Transactional
    public int replaceList(LocalDate from, LocalDate to, List<Map<String, Object>> rows) {
        int deleted = jdbc.update(
                DELETE_RANGE_SQL,
                new MapSqlParameterSource()
                        .addValue("from", from, Types.DATE)
                        .addValue("to", to, Types.DATE)
        );
        if (rows.isEmpty()) {
            log.info("list_accumulated_eyes deleted={} inserted=0 (empty)", deleted);
            return 0;
        }
        SqlParameterSource[] batch = rows.stream()
                .map(AccumulatedEyeMartWriter::toParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(INSERT_SQL, batch);
        int inserted = sum(updated);
        log.info("list_accumulated_eyes deleted={} inserted={}", deleted, inserted);
        return inserted;
    }

    private static SqlParameterSource toParams(Map<String, Object> row) {
        MapSqlParameterSource p = new MapSqlParameterSource();
        for (String k : KEYS) {
            Object v = row.get(k);
            // 빈 문자열 유입 방어 — INSERT 의 NULLIF 와 짝. trim 은 whitespace-only 케이스 대비.
            p.addValue(k, v == null ? "" : v.toString().trim());
        }
        return p;
    }

    /** 소스 SELECT 별칭과 1:1. 순서는 SQL 과 무관하지만 관리 편의상 소스 순서 유지. */
    private static final String[] KEYS = new String[]{
            "id", "custNum",
            "customName", "customPhone",
            "operationCategory", "operationCode",
            "operationDate", "accumulatedEyeCount", "eyePosition",
            "createDate", "lastModifiedDate", "isActive"
    };

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
