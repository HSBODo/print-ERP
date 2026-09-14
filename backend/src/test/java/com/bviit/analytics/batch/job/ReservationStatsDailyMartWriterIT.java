package com.bviit.analytics.batch.job;

import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 예약통계(시력교정·백내장) 일별 마트 통합 테스트 — Testcontainers Postgres 위에서
 * ReservationStatsDailyMartWriter 의 upsert 계약(ON CONFLICT DO UPDATE) 과
 * findLockedPeriods 필터를 검증.
 *
 * 회귀 방지 대상:
 *   - upsertSystemDaily · upsertCataractDaily: 같은 stat_date 재실행 시 값 덮어쓰기 (idempotent)
 *   - period 컬럼 자동 계산 (YYYY-MM 슬라이스) 정합
 *   - findLockedPeriods: product_type 별로만 필터링 (SYSTEM 요청 시 CATARACT 잠금은 미포함)
 */
@EnabledIfEnvironmentVariable(named = "RUN_INTEGRATION_TESTS", matches = "true")
@Testcontainers
class ReservationStatsDailyMartWriterIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("mart_test")
            .withUsername("test")
            .withPassword("test");

    private static HikariDataSource dataSource;

    private NamedParameterJdbcTemplate jdbc;
    private ReservationStatsDailyMartWriter writer;

    @BeforeEach
    void setUp() throws Exception {
        if (dataSource == null) {
            dataSource = new HikariDataSource();
            dataSource.setJdbcUrl(POSTGRES.getJdbcUrl());
            dataSource.setUsername(POSTGRES.getUsername());
            dataSource.setPassword(POSTGRES.getPassword());
        }
        this.jdbc = new NamedParameterJdbcTemplate(dataSource);
        this.writer = new ReservationStatsDailyMartWriter(jdbc);

        try (Connection conn = dataSource.getConnection()) {
            execSilently(conn, "DROP TABLE IF EXISTS "
                    + "mart_reservation_stats_system_daily, "
                    + "mart_reservation_stats_cataract_daily, "
                    + "reservation_stats_period_lock, "
                    + "reservation_stats_override, "
                    + "batch_watermark, batch_run_log CASCADE");
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/batch/tables/V1a__batch_run_log.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/batch/tables/V1b__batch_watermark.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/reservation/tables/V11a__mart_reservation_stats_system_daily.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/reservation/tables/V11b__mart_reservation_stats_cataract_daily.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/reservation/tables/V11c__reservation_stats_period_lock.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/reservation/tables/V11d__reservation_stats_override.sql"));
        }
    }

    @AfterAll
    static void tearDown() {
        if (dataSource != null) dataSource.close();
    }

    @Test
    void upsertSystemDaily_writesAndIsIdempotent() {
        ReservationStatsDailyRow v1 = systemRow("2026-06-15", 100);
        int rows1 = writer.upsertSystemDaily(List.of(v1));
        assertThat(rows1).isEqualTo(1);

        Integer inboundCall1 = jdbc.queryForObject(
                "SELECT inbound_call FROM mart_reservation_stats_system_daily WHERE stat_date = DATE '2026-06-15'",
                new MapSqlParameterSource(), Integer.class);
        assertThat(inboundCall1).isEqualTo(100);
        String period = jdbc.queryForObject(
                "SELECT period FROM mart_reservation_stats_system_daily WHERE stat_date = DATE '2026-06-15'",
                new MapSqlParameterSource(), String.class);
        assertThat(period).isEqualTo("2026-06");

        // 덮어쓰기
        writer.upsertSystemDaily(List.of(systemRow("2026-06-15", 250)));
        Integer inboundCall2 = jdbc.queryForObject(
                "SELECT inbound_call FROM mart_reservation_stats_system_daily WHERE stat_date = DATE '2026-06-15'",
                new MapSqlParameterSource(), Integer.class);
        assertThat(inboundCall2).isEqualTo(250);
    }

    @Test
    void upsertCataractDaily_writesAndIsIdempotent() {
        CataractStatsDailyRow v1 = cataractRow("2026-06-15", 50);
        int rows1 = writer.upsertCataractDaily(List.of(v1));
        assertThat(rows1).isEqualTo(1);

        Integer total1 = jdbc.queryForObject(
                "SELECT total_cataract FROM mart_reservation_stats_cataract_daily WHERE stat_date = DATE '2026-06-15'",
                new MapSqlParameterSource(), Integer.class);
        assertThat(total1).isEqualTo(50);

        writer.upsertCataractDaily(List.of(cataractRow("2026-06-15", 80)));
        Integer total2 = jdbc.queryForObject(
                "SELECT total_cataract FROM mart_reservation_stats_cataract_daily WHERE stat_date = DATE '2026-06-15'",
                new MapSqlParameterSource(), Integer.class);
        assertThat(total2).isEqualTo(80);
    }

    @Test
    void findLockedPeriods_filtersByProductType() {
        jdbc.update(
                "INSERT INTO reservation_stats_period_lock (product_type, period, locked_at) "
                        + "VALUES ('SYSTEM', '2026-05', CURRENT_TIMESTAMP), "
                        + "       ('SYSTEM', '2026-06', CURRENT_TIMESTAMP), "
                        + "       ('CATARACT', '2026-06', CURRENT_TIMESTAMP)",
                new MapSqlParameterSource());

        Set<String> systemLocks = writer.findLockedPeriods("SYSTEM");
        assertThat(systemLocks).containsExactlyInAnyOrder("2026-05", "2026-06");

        Set<String> cataractLocks = writer.findLockedPeriods("CATARACT");
        assertThat(cataractLocks).containsExactly("2026-06");
    }

    /** 시력교정 원시 카운트 25필드 중 inboundCall 만 마커, 나머지 0. */
    private static ReservationStatsDailyRow systemRow(String date, int inboundCall) {
        return new ReservationStatsDailyRow(
                date,
                inboundCall, 0, 0, 0,
                0, 0, 0,
                0, 0, 0,
                0, 0,
                0, 0, 0, 0,
                0, 0,
                0, 0, 0,
                0, 0, 0
        );
    }

    /** 백내장 원시 카운트 23필드 중 totalCataract 만 마커, 나머지 0. */
    private static CataractStatsDailyRow cataractRow(String date, int totalCataract) {
        return new CataractStatsDailyRow(
                date,
                totalCataract, 0,
                0, 0,
                0, 0, 0,
                0, 0, 0,
                0, 0, 0,
                0, 0,
                0, 0, 0,
                0, 0, 0
        );
    }

    private static void execSilently(Connection conn, String sql) throws Exception {
        try (var st = conn.createStatement()) {
            st.execute(sql);
        }
    }
}
