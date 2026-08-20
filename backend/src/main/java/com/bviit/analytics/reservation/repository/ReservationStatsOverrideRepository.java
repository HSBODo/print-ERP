package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 예약통계 셀 수기 보정 이력 — INSERT-only.
 *
 * (product_type, stat_date, field_name, created_at DESC) 로 조회 시 최신 값이 결정된다.
 * 배치와 무관하게 원본 카운트 위에 오버레이만 하므로, 배치 재실행이 override 를 지우지 않는다.
 * Legacy 짝 없음 — 마트 전용 audit 테이블이라 MSSQL 소스가 없다(Mart-Legacy 페어링 감사 시 참고).
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationStatsOverrideRepository {

    private static final String INSERT_SQL =
            SqlLoader.load("sql/mart/insert-reservation-stats-override.sql");
    private static final String SELECT_HISTORY_SQL =
            SqlLoader.load("sql/mart/select-reservation-stats-overrides.sql");

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

    /**
     * 범위 내 보정 이력 전체 — 오래된 순. 필드명은 마트 컬럼(snake_case) 그대로 반환하고,
     * 호출부(도메인별 Mart Repository)에서 API 필드(camelCase)로 재매핑한다.
     */
    public List<OverrideAudit> findAudits(String productType, String from, String to) {
        return jdbc.query(SELECT_HISTORY_SQL,
                new MapSqlParameterSource()
                        .addValue("productType", productType)
                        .addValue("from", from)
                        .addValue("to", to),
                (rs, n) -> new OverrideAudit(
                        rs.getString("stat_date"),
                        rs.getString("field_name"),
                        rs.getInt("override_value"),
                        rs.getString("created_by"),
                        rs.getString("created_at")));
    }

    /** 이력 1건 — 도메인별 DTO 로 변환하기 전의 원시 형태. */
    public record OverrideAudit(
            String date,          // yyyy-MM-dd
            String fieldName,     // snake_case 마트 컬럼명
            int overrideValue,
            String createdBy,
            String createdAt      // ISO-8601
    ) {
    }
}
