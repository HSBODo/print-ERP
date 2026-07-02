package com.bviit.analytics.batch.repository;

import com.bviit.analytics.common.util.SqlLoader;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.time.LocalDate;
import java.util.Optional;

/**
 * 마트별 마지막 성공 적재일 관리.
 * 다음 daily append 실행 시 (last_loaded_at + 1) ~ (yesterday) 구간을 처리한다.
 * 최초 실행 시 워터마크가 없으면 잡의 기본 시작일(코드 상수)을 사용.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class WatermarkRepository {

    private static final String FIND_SQL   = SqlLoader.load("sql/mart/find-watermark.sql");
    private static final String UPSERT_SQL = SqlLoader.load("sql/mart/upsert-watermark.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public Optional<LocalDate> find(String martName) {
        try {
            LocalDate value = jdbc.queryForObject(
                    FIND_SQL,
                    new MapSqlParameterSource("name", martName),
                    LocalDate.class
            );
            return Optional.ofNullable(value);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public void upsert(String martName, LocalDate lastLoadedAt) {
        jdbc.update(UPSERT_SQL, new MapSqlParameterSource()
                .addValue("name", martName)
                .addValue("date", lastLoadedAt, Types.DATE));
    }
}
