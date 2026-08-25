package com.bviit.analytics.batch.job;

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
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 예약자 리스트_홈페이지 마트 통합 테스트 — Testcontainers Postgres 위에서
 * ReservationListHomepageMartWriter 의 replaceList 가 delete+insert 계약을 지키는지 검증.
 *
 * 회귀 방지 대상:
 *   - replaceList: 범위 delete 후 insert. 범위 밖 행은 남고, 범위 안은 새 데이터로 교체.
 *   - 빈 rows 입력: delete 는 여전히 수행 → 범위가 비워진다 (배치 재실행 안전성).
 *   - camelCase 파라미터 ↔ snake_case 컬럼 매핑 라운드트립.
 */
@EnabledIfEnvironmentVariable(named = "RUN_INTEGRATION_TESTS", matches = "true")
@Testcontainers
class ReservationListHomepageMartWriterIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("mart_test")
            .withUsername("test")
            .withPassword("test");

    private static HikariDataSource dataSource;

    private NamedParameterJdbcTemplate jdbc;
    private ReservationListHomepageMartWriter writer;

    @BeforeEach
    void setUp() throws Exception {
        if (dataSource == null) {
            dataSource = new HikariDataSource();
            dataSource.setJdbcUrl(POSTGRES.getJdbcUrl());
            dataSource.setUsername(POSTGRES.getUsername());
            dataSource.setPassword(POSTGRES.getPassword());
        }
        this.jdbc = new NamedParameterJdbcTemplate(dataSource);
        this.writer = new ReservationListHomepageMartWriter(jdbc);

        try (Connection conn = dataSource.getConnection()) {
            execSilently(conn, "DROP TABLE IF EXISTS mart_list_reservation_homepage, "
                    + "batch_watermark, batch_run_log CASCADE");
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/tables/batch/V1__batch_meta.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/tables/reservation/V21__mart_list_reservation_homepage.sql"));
        }
    }

    @AfterAll
    static void tearDown() {
        if (dataSource != null) dataSource.close();
    }

    @Test
    void replaceList_writesRowsInRange() {
        LocalDate from = LocalDate.of(2026, 6, 1);
        LocalDate to = LocalDate.of(2026, 6, 30);
        List<Map<String, Object>> rows = List.of(
                sampleRow("L001", "2026-06-15 10:00:00"),
                sampleRow("L002", "2026-06-20 14:30:00")
        );

        int inserted = writer.replaceList(from, to, rows);

        assertThat(inserted).isEqualTo(2);
        List<Map<String, Object>> read = jdbc.queryForList(
                "SELECT legacy_no, name FROM mart_list_reservation_homepage ORDER BY legacy_no",
                new MapSqlParameterSource());
        assertThat(read).hasSize(2);
        assertThat(read.get(0).get("legacy_no")).isEqualTo("L001");
        assertThat(read.get(1).get("legacy_no")).isEqualTo("L002");
    }

    @Test
    void replaceList_deletesRangeThenInserts() {
        // 기존 데이터 준비: 범위 밖 1건 + 범위 안 1건
        writer.replaceList(
                LocalDate.of(2026, 5, 1), LocalDate.of(2026, 6, 30),
                List.of(sampleRow("KEEP", "2026-05-10 09:00:00"),
                        sampleRow("OLD",  "2026-06-15 09:00:00"))
        );

        // 6월만 replaceList → 5월 KEEP 은 유지, 6월 OLD 는 사라지고 NEW 로 교체
        writer.replaceList(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of(sampleRow("NEW", "2026-06-20 12:00:00"))
        );

        List<String> legacyNos = jdbc.queryForList(
                "SELECT legacy_no FROM mart_list_reservation_homepage ORDER BY legacy_no",
                new MapSqlParameterSource(), String.class);
        assertThat(legacyNos).containsExactly("KEEP", "NEW");
    }

    @Test
    void replaceList_emptyRowsStillDeletesRange() {
        writer.replaceList(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of(sampleRow("X", "2026-06-15 10:00:00"))
        );
        assertThat(rowCount()).isEqualTo(1);

        // 빈 rows 재실행: delete 는 여전히 수행되어야 함 → 범위 비어짐
        int inserted = writer.replaceList(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of()
        );
        assertThat(inserted).isZero();
        assertThat(rowCount()).isZero();
    }

    private int rowCount() {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM mart_list_reservation_homepage",
                new MapSqlParameterSource(), Integer.class);
        return n == null ? 0 : n;
    }

    /** 소스 SELECT 별칭 14개를 채운 최소 샘플 행. */
    private static Map<String, Object> sampleRow(String legacyNo, String regDate) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("legacyNo", legacyNo);
        row.put("deviceType", "PC");
        row.put("name", "tester");
        row.put("phone", "010-0000-0000");
        row.put("reserveDate", "2026-06-30");
        row.put("reserveTime", "10:00");
        row.put("utmSource", "");
        row.put("utmMedium", "");
        row.put("utmCampaign", "");
        row.put("referralCode", "");
        row.put("examType", "5");
        row.put("surgeryTf", "F");
        row.put("isReserve", "Y");
        row.put("regDate", regDate);
        return row;
    }

    private static void execSilently(Connection conn, String sql) throws Exception {
        try (var st = conn.createStatement()) {
            st.execute(sql);
        }
    }
}
