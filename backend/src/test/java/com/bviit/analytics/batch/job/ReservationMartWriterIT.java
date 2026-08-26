package com.bviit.analytics.batch.job;

import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.repository.ReservationStatsMartRepository;
import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 예약 마트 통합 테스트 — Testcontainers Postgres 위에서
 * ReservationMartWriter가 쓴 값을 ReservationStatsMartRepository가 그대로 읽어내는지 검증.
 *
 * 회귀 방지 대상:
 *   - upsertMonthly:    (yr,mo) 충돌 시 값이 덮어써진다 (idempotent)
 *   - replaceList:      기간 delete+insert. 범위 밖 데이터는 남고, 범위 안은 새 데이터로 교체
 *   - 라운드트립:        Writer가 쓴 값 == Repository가 읽는 값 (컬럼 매핑 오류 감지)
 *
 * Spring 컨텍스트 없이 실제 DDL + JdbcTemplate만 사용해 빠르게 돈다.
 */
@EnabledIfEnvironmentVariable(named = "RUN_INTEGRATION_TESTS", matches = "true")
@Testcontainers
class ReservationMartWriterIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("mart_test")
            .withUsername("test")
            .withPassword("test");

    private static HikariDataSource dataSource;

    private NamedParameterJdbcTemplate jdbc;
    private ReservationMartWriter writer;
    private ReservationStatsMartRepository martRepo;

    @BeforeEach
    void setUp() throws Exception {
        if (dataSource == null) {
            dataSource = new HikariDataSource();
            dataSource.setJdbcUrl(POSTGRES.getJdbcUrl());
            dataSource.setUsername(POSTGRES.getUsername());
            dataSource.setPassword(POSTGRES.getPassword());
        }
        this.jdbc = new NamedParameterJdbcTemplate(dataSource);
        this.writer = new ReservationMartWriter(jdbc);
        this.martRepo = new ReservationStatsMartRepository(jdbc);

        // 매 테스트마다 clean state — DDL 재실행 + 데이터 초기화
        try (Connection conn = dataSource.getConnection()) {
            execSilently(conn, "DROP TABLE IF EXISTS list_reservation, mart_reservation_monthly, "
                    + "batch_watermark, batch_run_log CASCADE");
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/tables/batch/V1a__batch_run_log.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/tables/batch/V1b__batch_watermark.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/tables/reservation/V3a__mart_reservation_monthly.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/tables/reservation/V3b__list_reservation.sql"));
        }
    }

    @AfterAll
    static void tearDown() {
        if (dataSource != null) dataSource.close();
    }

    @Test
    void upsertMonthly_writesAndIsIdempotent() {
        ReservationMonthlyItem v1 = sampleMonthly(2026, 6, 100, 20, 5);
        int rows1 = writer.upsertMonthly(List.of(v1));
        assertThat(rows1).isEqualTo(1);
        assertThat(martRepo.findMonthly(List.of(2026)))
                .singleElement()
                .satisfies(m -> {
                    assertThat(m.getYear()).isEqualTo(2026);
                    assertThat(m.getMonth()).isEqualTo(6);
                    assertThat(m.getSurgery()).isEqualTo(100);
                    assertThat(m.getOutpatient()).isEqualTo(20);
                    assertThat(m.getDreamlens()).isEqualTo(5);
                });

        // 동일 (yr,mo)를 다른 값으로 upsert → 덮어써진다
        ReservationMonthlyItem v2 = sampleMonthly(2026, 6, 200, 40, 10);
        writer.upsertMonthly(List.of(v2));
        List<ReservationMonthlyItem> after = martRepo.findMonthly(List.of(2026));
        assertThat(after).hasSize(1);
        assertThat(after.get(0).getSurgery()).isEqualTo(200);
        assertThat(after.get(0).getOutpatient()).isEqualTo(40);
        assertThat(after.get(0).getDreamlens()).isEqualTo(10);
    }

    @Test
    void upsertMonthly_roundTrip_allFieldsPreserved() {
        // 모든 필드에 서로 다른 값을 넣어 컬럼 오매핑을 잡는다
        ReservationMonthlyItem in = ReservationMonthlyItem.builder()
                .year(2025).month(3)
                .surgery(11).outpatient(22).dreamlens(33).total(66)
                .build();
        writer.upsertMonthly(List.of(in));

        ReservationMonthlyItem out = martRepo.findMonthly(List.of(2025)).get(0);
        assertThat(out.getYear()).isEqualTo(2025);
        assertThat(out.getMonth()).isEqualTo(3);
        assertThat(out.getSurgery()).isEqualTo(11);
        assertThat(out.getOutpatient()).isEqualTo(22);
        assertThat(out.getDreamlens()).isEqualTo(33);
        assertThat(out.getTotal()).isEqualTo(66);
    }

    @Test
    void replaceList_deletesRangeThenInserts_leavingOutsideRangeIntact() {
        // 3개의 리스트 행 준비: 2026-06-01, 2026-06-15, 2026-07-01
        writer.replaceList(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 7, 31),
                List.of(
                        listRow("A", "2026-06-01", "온라인"),
                        listRow("B", "2026-06-15", "콜"),
                        listRow("C", "2026-07-01", "온라인")
                )
        );

        // 6월 범위만 새 데이터로 교체 (7월 데이터는 유지되어야 함)
        writer.replaceList(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of(listRow("X", "2026-06-20", "콜"))
        );

        List<Map<String, Object>> all = martRepo.findList("2026-06-01", "2026-07-31");
        assertThat(all)
                .extracting(r -> r.get("chartNo") + "|" + r.get("registeredAt"))
                .containsExactlyInAnyOrder("X|2026-06-20", "C|2026-07-01");
    }

    @Test
    void replaceList_emptyRows_stillDeletesRange() {
        writer.replaceList(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of(listRow("A", "2026-06-01", "온라인"))
        );
        // 빈 리스트로 replace → 범위의 기존 데이터가 삭제되어야 함
        int inserted = writer.replaceList(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of()
        );
        assertThat(inserted).isZero();
        assertThat(martRepo.findList("2026-06-01", "2026-06-30")).isEmpty();
    }

    // ─── helpers ─────────────────────────────────────────────

    private static ReservationMonthlyItem sampleMonthly(int yr, int mo, int surgery, int outpatient, int dreamlens) {
        return ReservationMonthlyItem.builder()
                .year(yr).month(mo)
                .surgery(surgery).outpatient(outpatient).dreamlens(dreamlens)
                .total(surgery + outpatient + dreamlens)
                .build();
    }

    private static Map<String, Object> listRow(String chartNo, String registeredAt, String channelGroup) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("registeredAt", registeredAt);
        row.put("registeredTime", "09:00");
        row.put("reserveDate", "");
        row.put("reserveTime", "");
        row.put("chartNo", chartNo);
        row.put("name", "환자" + chartNo);
        row.put("reserveState", "Y");
        row.put("channel", channelGroup.equals("콜") ? "인콜" : "네이버");
        row.put("channelGroup", channelGroup);
        row.put("doctor", "");
        row.put("counselor", "");
        row.put("comment", "");
        return row;
    }

    private static void execSilently(Connection conn, String sql) throws Exception {
        try (var st = conn.createStatement()) {
            st.execute(sql);
        }
    }
}
