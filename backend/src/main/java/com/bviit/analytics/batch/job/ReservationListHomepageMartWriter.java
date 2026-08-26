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
 * 예약자 리스트_홈페이지 마트 write — delete 범위 + insert.
 *
 * <p>소스 SELECT(mariadb/select-reservation-list-homepage.sql) 의 camelCase 별칭을 그대로 파라미터로
 * 넣는다 — Job 이 원본 Map 을 그대로 넘긴다. reservation 도메인의 replaceList 패턴과 동일.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationListHomepageMartWriter {

    private static final String DELETE_RANGE_SQL = SqlLoader.load("sql/mart/delete-list-reservation-homepage-range.sql");
    private static final String INSERT_SQL       = SqlLoader.load("sql/mart/insert-list-reservation-homepage.sql");

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
            log.info("mart_list_reservation_homepage deleted={} inserted=0 (empty)", deleted);
            return 0;
        }
        SqlParameterSource[] batch = rows.stream()
                .map(ReservationListHomepageMartWriter::toParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(INSERT_SQL, batch);
        int inserted = sum(updated);
        log.info("mart_list_reservation_homepage deleted={} inserted={}", deleted, inserted);
        return inserted;
    }

    private static SqlParameterSource toParams(Map<String, Object> row) {
        MapSqlParameterSource p = new MapSqlParameterSource();
        for (String k : KEYS) {
            Object v = row.get(k);
            // 원본에 whitespace-only 값이 섞여 들어올 수 있어 trim (reservation writer 와 동일 처리).
            p.addValue(k, v == null ? "" : v.toString().trim());
        }
        return p;
    }

    /**
     * 소스 SELECT 별칭과 1:1. 순서·이름을 소스 SQL 과 어긋나게 두면 채워지지 않은 컬럼이
     * 조용히 빈값으로 들어가므로, 여기서 유일한 원천으로 관리한다.
     */
    private static final String[] KEYS = new String[]{
            "legacyNo", "deviceType",
            "name", "phone",
            "reserveDate", "reserveTime",
            "utmSource", "utmMedium", "utmCampaign",
            "referralCode",
            "examType", "surgeryTf", "isReserve",
            "regDate"
    };

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
