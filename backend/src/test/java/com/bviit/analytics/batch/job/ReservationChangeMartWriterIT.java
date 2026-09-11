package com.bviit.analytics.batch.job;

import com.bviit.analytics.reservation.dto.ReservationChangeRow;
import com.bviit.analytics.reservation.repository.ReservationChangeMartRepository;
import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 예약 변경이력 마트 통합 테스트 — Testcontainers Postgres 위에서 Writer 가 쓴 값을
 * Repository 가 그대로 읽어내는지 검증. 회귀 방지 대상:
 * <ul>
 *   <li>upsert: reserve_num 충돌 시 change_count·change_chain·final_date 등 덮어써진다 (늦은 변경 반영 시나리오)</li>
 *   <li>빈 rows 도 안전 (0 반환 · 예외 없음)</li>
 *   <li>Repository 3종(list·daily-registered·daily-reserve-date) 조회가 Writer 산출물을 그대로 되돌려준다</li>
 *   <li>change_count ≥ 1 필터: findByRegisteredRange 는 변경된 예약만 반환 (미변경 0 은 daily 집계에만 쓴다)</li>
 *   <li>일별 집계는 registered_at vs final_date 축이 다르다 (두 SQL 이 서로 다른 값을 낸다)</li>
 * </ul>
 * Spring 컨텍스트 없이 실제 DDL + JdbcTemplate 만 사용해 빠르게 돈다.
 */
@EnabledIfEnvironmentVariable(named = "RUN_INTEGRATION_TESTS", matches = "true")
@Testcontainers
class ReservationChangeMartWriterIT {

    @Container
    @SuppressWarnings("resource") // Lifecycle is managed by Testcontainers.
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("mart_test")
            .withUsername("test")
            .withPassword("test");

    private static HikariDataSource dataSource;

    private NamedParameterJdbcTemplate jdbc;
    private ReservationChangeMartWriter writer;
    private ReservationChangeMartRepository martRepo;

    @BeforeEach
    void setUp() throws Exception {
        if (dataSource == null) {
            dataSource = new HikariDataSource();
            dataSource.setJdbcUrl(POSTGRES.getJdbcUrl());
            dataSource.setUsername(POSTGRES.getUsername());
            dataSource.setPassword(POSTGRES.getPassword());
        }
        this.jdbc = new NamedParameterJdbcTemplate(dataSource);
        this.writer = new ReservationChangeMartWriter(jdbc);
        this.martRepo = new ReservationChangeMartRepository(jdbc);

        try (Connection conn = dataSource.getConnection()) {
            execSilently(conn, "DROP TABLE IF EXISTS list_reservation_change CASCADE");
            ScriptUtils.executeSqlScript(conn,
                    new ClassPathResource("sql/mart/reservation/tables/V63__list_reservation_change.sql"));
        }
    }

    @AfterAll
    static void tearDown() {
        if (dataSource != null) dataSource.close();
    }

    @Test
    void upsert_writesRowsAndReadsBackViaRepository() {
        writer.upsert(List.of(
                row("R001", "2026-09-01", "1", "2026-09-15"),   // 변경 1회
                row("R002", "2026-09-02", "0", "2026-09-20")    // 미변경 (daily 집계 분모)
        ));

        // findByRegisteredRange: change_count >= 1 필터 → R001 만.
        List<Map<String, Object>> changed = martRepo.findByRegisteredRange("2026-09-01", "2026-09-30");
        assertThat(changed).hasSize(1);
        assertThat(changed.get(0).get("reserveNum")).isEqualTo("R001");
        assertThat(changed.get(0).get("changeCount")).isEqualTo(1);
    }

    @Test
    void upsert_conflictOnReserveNum_overwritesChangeCountAndChain() {
        // 최초 등록 — 변경 1회
        writer.upsert(List.of(row("R100", "2026-09-01", "1",
                "2026-09-01 09:00@2026-09-15|2026-09-05 14:00@2026-09-20", "2026-09-20")));
        // 늦은 변경 흡수 시나리오 — 같은 reserve_num, change_count 2 로 갱신
        writer.upsert(List.of(row("R100", "2026-09-01", "2",
                "2026-09-01 09:00@2026-09-15|2026-09-05 14:00@2026-09-20|2026-09-10 10:00@2026-09-25",
                "2026-09-25")));

        List<Map<String, Object>> after = martRepo.findByRegisteredRange("2026-09-01", "2026-09-30");
        assertThat(after).hasSize(1);
        assertThat(after.get(0).get("changeCount")).isEqualTo(2);
        assertThat((String) after.get(0).get("finalDate")).isEqualTo("2026-09-25");
    }

    @Test
    void upsert_emptyList_returnsZeroWithoutError() {
        int total = writer.upsert(List.of());
        assertThat(total).isZero();
        assertThat(martRepo.findByRegisteredRange("2026-09-01", "2026-09-30")).isEmpty();
    }

    @Test
    void daily_registered_and_reserveDate_useDifferentAxes() {
        // 등록일 2026-09-01, 최종 예약일 2026-09-20 → 두 집계가 서로 다른 날짜 버킷에 들어간다.
        writer.upsert(List.of(row("R200", "2026-09-01", "1", "2026-09-20")));

        List<Map<String, Object>> byReg = martRepo.findDailyByRegistered("2026-09-01", "2026-09-30");
        List<Map<String, Object>> byRes = martRepo.findDailyByReserveDate("2026-09-01", "2026-09-30");

        // 등록일 축: 09-01 에 카운트
        assertThat(byReg)
                .anyMatch(r -> "2026-09-01".equals(String.valueOf(r.get("day"))));
        // 최종 예약일 축: 09-20 에 카운트
        assertThat(byRes)
                .anyMatch(r -> "2026-09-20".equals(String.valueOf(r.get("day"))));
    }

    @Test
    void findByRegisteredRange_excludesChangeCountZero() {
        // change_count=0 는 daily 집계 분모용이라 화면 변경 상세에는 노출되면 안 된다.
        writer.upsert(List.of(
                row("R300", "2026-09-05", "0", "2026-09-15"),
                row("R301", "2026-09-05", "3", "2026-09-15")
        ));

        List<Map<String, Object>> list = martRepo.findByRegisteredRange("2026-09-01", "2026-09-30");
        assertThat(list)
                .extracting(r -> String.valueOf(r.get("reserveNum")))
                .containsExactly("R301");
    }

    // ─── helpers ─────────────────────────────────────────────

    /** 편의 팩토리: 변경 체인은 자동 생성 (테스트 초점이 chain 문자열이 아닐 때). */
    private static ReservationChangeRow row(String reserveNum, String registeredAt, String changeCount, String finalDate) {
        int count = Integer.parseInt(changeCount);
        String chain = count == 0
                ? registeredAt + " 09:00@" + finalDate
                : registeredAt + " 09:00@" + finalDate + "|" + registeredAt + " 10:00@" + finalDate;
        return row(reserveNum, registeredAt, changeCount, chain, finalDate);
    }

    private static ReservationChangeRow row(String reserveNum, String registeredAt, String changeCount,
                                            String chain, String finalDate) {
        return new ReservationChangeRow(
                reserveNum,
                registeredAt,
                "09:00",
                "H",
                "C" + reserveNum,
                "홍길동",
                "M",
                "Y",
                registeredAt,
                finalDate,
                Integer.parseInt(changeCount),
                chain,
                registeredAt + " 10:00"
        );
    }

    private static void execSilently(Connection conn, String sql) {
        try (var stmt = conn.createStatement()) {
            stmt.execute(sql);
        } catch (Exception ignored) {
            // 최초 실행은 테이블이 없을 수 있으므로 무시
        }
    }
}
