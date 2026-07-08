package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * 예약통계 셀 수기 보정 이력 — INSERT-only.
 *
 * (product_type, stat_date, field_name, created_at DESC) 로 조회 시 최신 값이 결정된다.
 * 배치와 무관하게 원본 카운트 위에 오버레이만 하므로, 배치 재실행이 override 를 지우지 않는다.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationStatsOverrideRepository {

    private static final String INSERT_SQL =
            SqlLoader.load("sql/mart/insert-reservation-stats-override.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public void insert(String productType, String statDate, String fieldName,
                       int overrideValue, String reason, String createdBy) {
        jdbc.update(INSERT_SQL, new MapSqlParameterSource()
                .addValue("productType", productType)
                .addValue("statDate", statDate)
                .addValue("fieldName", fieldName)
                .addValue("overrideValue", overrideValue)
                .addValue("reason", reason)
                .addValue("createdBy", createdBy));
    }
}
