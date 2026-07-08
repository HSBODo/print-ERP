package com.bviit.analytics.batch.job;

import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgeryMonthlyItem;
import com.bviit.analytics.surgery.repository.SurgeryStatsMartRepository;
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

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 수술 마트 통합 테스트 — Testcontainers Postgres 위에서
 * SurgeryMartWriter가 쓴 값을 SurgeryStatsMartRepository가 그대로 읽어내는지 검증.
 *
 * 회귀 방지 대상:
 *   - upsertMonthly: (yr,mo) 충돌 시 값이 덮어써진다 (idempotent)
 *   - upsertDaily:   (dt) 충돌 시 값이 덮어써진다 (idempotent)
 *   - replaceList:   기간 delete+insert. 범위 밖 데이터는 남고, 범위 안은 새 데이터로 교체
 *   - 라운드트립:    Writer가 쓴 값 == Repository가 읽는 값 (컬럼 매핑 오류 감지)
 *
 * Spring 컨텍스트 없이 실제 DDL + JdbcTemplate만 사용해 빠르게 돈다.
 */
@EnabledIfEnvironmentVariable(named = "RUN_INTEGRATION_TESTS", matches = "true")
@Testcontainers
class SurgeryMartWriterIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("mart_test")
            .withUsername("test")
            .withPassword("test");

    private static HikariDataSource dataSource;

    private NamedParameterJdbcTemplate jdbc;
    private SurgeryMartWriter writer;
    private SurgeryStatsMartRepository martRepo;

    @BeforeEach
    void setUp() throws Exception {
        if (dataSource == null) {
            dataSource = new HikariDataSource();
            dataSource.setJdbcUrl(POSTGRES.getJdbcUrl());
            dataSource.setUsername(POSTGRES.getUsername());
            dataSource.setPassword(POSTGRES.getPassword());
        }
        this.jdbc = new NamedParameterJdbcTemplate(dataSource);
        this.writer = new SurgeryMartWriter(jdbc);
        this.martRepo = new SurgeryStatsMartRepository(jdbc);

        // 매 테스트마다 clean state — DDL 재실행 + 데이터 초기화
        try (Connection conn = dataSource.getConnection()) {
            execSilently(conn, "DROP TABLE IF EXISTS list_surgery, mart_surgery_daily, mart_surgery_monthly, batch_watermark, batch_run_log CASCADE");
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/V1__batch_meta.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/V2__surgery_mart.sql"));
        }
    }

    @AfterAll
    static void tearDown() {
        if (dataSource != null) dataSource.close();
    }

    @Test
    void upsertMonthly_writesAndIsIdempotent() {
        SurgeryMonthlyItem v1 = sampleMonthly(2026, 6, 100, 10);
        int rows1 = writer.upsertMonthly(List.of(v1));
        assertThat(rows1).isEqualTo(1);
        assertThat(martRepo.findMonthly(List.of(2026)))
                .singleElement()
                .satisfies(m -> {
                    assertThat(m.getYear()).isEqualTo(2026);
                    assertThat(m.getMonth()).isEqualTo(6);
                    assertThat(m.getVisionPatients()).isEqualTo(100);
                    assertThat(m.getCataractPatients()).isEqualTo(10);
                });

        // 동일 (yr,mo)를 다른 값으로 upsert → 덮어써진다
        SurgeryMonthlyItem v2 = sampleMonthly(2026, 6, 200, 20);
        writer.upsertMonthly(List.of(v2));
        List<SurgeryMonthlyItem> after = martRepo.findMonthly(List.of(2026));
        assertThat(after).hasSize(1);
        assertThat(after.get(0).getVisionPatients()).isEqualTo(200);
        assertThat(after.get(0).getCataractPatients()).isEqualTo(20);
    }

    @Test
    void upsertMonthly_roundTrip_allFieldsPreserved() {
        // 모든 필드에 서로 다른 값을 넣어 컬럼 오매핑을 잡는다
        SurgeryMonthlyItem in = SurgeryMonthlyItem.builder()
                .year(2025).month(3)
                .lasek(11).lasik(12).smile(13).smilePro(14)
                .icl(15).tIcl(16).kpl(17).tKpl(18).viva(19)
                .catMulti(21).catMono(22).catEdof(23)
                .xtra(24).waveVision(25).monoVision(26).contra(27).personal(28)
                .lasekEx(29).lasekRed(30)
                .reoperation(31).reopLaser(32).reopLens(33)
                .visionPatients(101).cataractPatients(45).total(146)
                .build();
        writer.upsertMonthly(List.of(in));

        SurgeryMonthlyItem out = martRepo.findMonthly(List.of(2025)).get(0);
        assertThat(out.getLasek()).isEqualTo(11);
        assertThat(out.getLasik()).isEqualTo(12);
        assertThat(out.getSmile()).isEqualTo(13);
        assertThat(out.getSmilePro()).isEqualTo(14);
        assertThat(out.getIcl()).isEqualTo(15);
        assertThat(out.getTIcl()).isEqualTo(16);
        assertThat(out.getKpl()).isEqualTo(17);
        assertThat(out.getTKpl()).isEqualTo(18);
        assertThat(out.getViva()).isEqualTo(19);
        assertThat(out.getCatMulti()).isEqualTo(21);
        assertThat(out.getCatMono()).isEqualTo(22);
        assertThat(out.getCatEdof()).isEqualTo(23);
        assertThat(out.getXtra()).isEqualTo(24);
        assertThat(out.getWaveVision()).isEqualTo(25);
        assertThat(out.getMonoVision()).isEqualTo(26);
        assertThat(out.getContra()).isEqualTo(27);
        assertThat(out.getPersonal()).isEqualTo(28);
        assertThat(out.getLasekEx()).isEqualTo(29);
        assertThat(out.getLasekRed()).isEqualTo(30);
        assertThat(out.getReoperation()).isEqualTo(31);
        assertThat(out.getReopLaser()).isEqualTo(32);
        assertThat(out.getReopLens()).isEqualTo(33);
        assertThat(out.getVisionPatients()).isEqualTo(101);
        assertThat(out.getCataractPatients()).isEqualTo(45);
        assertThat(out.getTotal()).isEqualTo(146);
    }

    @Test
    void upsertDaily_writesAndIsIdempotent() {
        SurgeryDailyItem v1 = sampleDaily("2026-06-15", 50, 5);
        int rows1 = writer.upsertDaily(List.of(v1));
        assertThat(rows1).isEqualTo(1);

        SurgeryDailyItem v2 = sampleDaily("2026-06-15", 60, 6);
        writer.upsertDaily(List.of(v2));

        List<SurgeryDailyItem> read = martRepo.findDaily("2026-06-15", "2026-06-15");
        assertThat(read).hasSize(1);
        assertThat(read.get(0).getVisionPatients()).isEqualTo(60);
        assertThat(read.get(0).getCataractPatients()).isEqualTo(6);
    }

    @Test
    void replaceList_deletesRangeThenInserts_leavingOutsideRangeIntact() {
        // 3개의 리스트 행 준비: 2026-06-01, 2026-06-15, 2026-07-01
        writer.replaceList(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 7, 31),
                List.of(
                        listRow("A", "2026-06-01", "시력교정"),
                        listRow("B", "2026-06-15", "백내장"),
                        listRow("C", "2026-07-01", "시력교정")
                )
        );

        // 6월 범위만 새 데이터로 교체 (7월 데이터는 유지되어야 함)
        writer.replaceList(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of(listRow("X", "2026-06-20", "시력교정"))
        );

        List<Map<String, Object>> all = martRepo.findList("2026-06-01", "2026-07-31");
        assertThat(all)
                .extracting(r -> r.get("chartNo") + "|" + r.get("surgeryDate"))
                .containsExactlyInAnyOrder("X|2026-06-20", "C|2026-07-01");
    }

    @Test
    void replaceList_emptyRows_stillDeletesRange() {
        writer.replaceList(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of(listRow("A", "2026-06-01", "시력교정"))
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

    private static SurgeryMonthlyItem sampleMonthly(int yr, int mo, int vision, int cataract) {
        return SurgeryMonthlyItem.builder()
                .year(yr).month(mo)
                .lasek(0).lasik(0).smile(0).smilePro(0)
                .icl(0).tIcl(0).kpl(0).tKpl(0).viva(0)
                .catMulti(0).catMono(0).catEdof(0)
                .xtra(0).waveVision(0).monoVision(0).contra(0).personal(0)
                .lasekEx(0).lasekRed(0)
                .reoperation(0).reopLaser(0).reopLens(0)
                .visionPatients(vision).cataractPatients(cataract).total(vision + cataract)
                .build();
    }

    private static SurgeryDailyItem sampleDaily(String date, int vision, int cataract) {
        return SurgeryDailyItem.builder()
                .date(date)
                .lasek(0).lasik(0).smile(0).smilePro(0)
                .icl(0).tIcl(0).kpl(0).tKpl(0).viva(0)
                .catMulti(0).catMono(0).catEdof(0)
                .xtra(0).waveVision(0).monoVision(0).contra(0).personal(0)
                .lasekEx(0).lasekRed(0)
                .reoperation(0).reopLaser(0).reopLens(0)
                .visionPatients(vision).cataractPatients(cataract).total(vision + cataract)
                .build();
    }

    private static Map<String, Object> listRow(String chartNo, String date, String category) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("chartNo", chartNo);
        row.put("name", "환자" + chartNo);
        row.put("surgeryCategory", category);
        row.put("surgeryDate", date);
        // 다른 필드는 빈 값 — Writer가 trim/null 처리로 감당
        return row;
    }

    private static void execSilently(Connection conn, String sql) throws Exception {
        try (var st = conn.createStatement()) {
            st.execute(sql);
        }
    }
}
