package com.bviit.analytics.batch.job;

import com.bviit.analytics.exam.dto.ExaminationMonthlyItem;
import com.bviit.analytics.exam.dto.ProcedureExamMonthlyItem;
import com.bviit.analytics.exam.repository.ExamStatsMartRepository;
import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
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
 * 검사 마트 통합 테스트 — Testcontainers Postgres 위에서
 * ExamMartWriter가 쓴 값을 ExamStatsMartRepository가 그대로 읽어내는지 검증.
 *
 * 회귀 방지 대상:
 *   - upsertExaminationMonthly:    (yr,mo) 충돌 시 값이 덮어써진다 (idempotent + roundtrip)
 *   - upsertProcedureExamMonthly:  (yr,mo) 충돌 시 값이 덮어써진다 (idempotent + roundtrip)
 *   - replaceListExam:             기간 delete+insert. 범위 밖 데이터는 남고, 범위 안은 새 데이터로 교체
 *   - replaceListCataractExam:     동일 패턴 (별도 테이블에 격리)
 *   - 빈 rows로 replace 시도 시에도 범위 삭제 발생
 *
 * Spring 컨텍스트 없이 실제 DDL + JdbcTemplate만 사용해 빠르게 돈다.
 */
@Testcontainers
class ExamMartWriterIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("mart_test")
            .withUsername("test")
            .withPassword("test");

    private static HikariDataSource dataSource;

    private NamedParameterJdbcTemplate jdbc;
    private ExamMartWriter writer;
    private ExamStatsMartRepository martRepo;

    @BeforeEach
    void setUp() throws Exception {
        if (dataSource == null) {
            dataSource = new HikariDataSource();
            dataSource.setJdbcUrl(POSTGRES.getJdbcUrl());
            dataSource.setUsername(POSTGRES.getUsername());
            dataSource.setPassword(POSTGRES.getPassword());
        }
        this.jdbc = new NamedParameterJdbcTemplate(dataSource);
        this.writer = new ExamMartWriter(jdbc);
        this.martRepo = new ExamStatsMartRepository(jdbc);

        try (Connection conn = dataSource.getConnection()) {
            execSilently(conn, "DROP TABLE IF EXISTS list_cataract_exam, list_exam, "
                    + "mart_procedure_exam_monthly, mart_examination_monthly, "
                    + "batch_watermark, batch_run_log CASCADE");
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/V1__batch_meta.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/V4__exam_mart.sql"));
        }
    }

    @AfterAll
    static void tearDown() {
        if (dataSource != null) dataSource.close();
    }

    @Test
    void upsertExaminationMonthly_writesAndIsIdempotent() {
        ExaminationMonthlyItem v1 = sampleExamination(2026, 6, 100, 5, 10);
        int rows1 = writer.upsertExaminationMonthly(List.of(v1));
        assertThat(rows1).isEqualTo(1);
        assertThat(martRepo.findExaminationMonthly(List.of(2026)))
                .singleElement()
                .satisfies(m -> {
                    assertThat(m.getYear()).isEqualTo(2026);
                    assertThat(m.getMonth()).isEqualTo(6);
                    assertThat(m.getVisionCorrection()).isEqualTo(100);
                    assertThat(m.getDreamlens()).isEqualTo(5);
                    assertThat(m.getCataract()).isEqualTo(10);
                    assertThat(m.getExamTotal()).isEqualTo(115);
                    assertThat(m.getTotal()).isEqualTo(115);
                });

        // 동일 (yr,mo)를 다른 값으로 upsert → 덮어써진다
        ExaminationMonthlyItem v2 = sampleExamination(2026, 6, 200, 10, 20);
        writer.upsertExaminationMonthly(List.of(v2));
        List<ExaminationMonthlyItem> after = martRepo.findExaminationMonthly(List.of(2026));
        assertThat(after).hasSize(1);
        assertThat(after.get(0).getVisionCorrection()).isEqualTo(200);
        assertThat(after.get(0).getDreamlens()).isEqualTo(10);
        assertThat(after.get(0).getCataract()).isEqualTo(20);
        assertThat(after.get(0).getExamTotal()).isEqualTo(230);
    }

    @Test
    void upsertProcedureExamMonthly_writesAndIsIdempotent() {
        ProcedureExamMonthlyItem v1 = sampleProcedureExam(2025, 3, 2000, 800);
        int rows1 = writer.upsertProcedureExamMonthly(List.of(v1));
        assertThat(rows1).isEqualTo(1);

        ProcedureExamMonthlyItem v2 = sampleProcedureExam(2025, 3, 2500, 1000);
        writer.upsertProcedureExamMonthly(List.of(v2));

        List<ProcedureExamMonthlyItem> after = martRepo.findProcedureExamMonthly(List.of(2025));
        assertThat(after).hasSize(1);
        assertThat(after.get(0).getExamCount()).isEqualTo(2500);
        assertThat(after.get(0).getOneDayExamCount()).isEqualTo(1000);
        assertThat(after.get(0).getTotal()).isEqualTo(2500);
    }

    @Test
    void replaceListExam_deletesRangeThenInserts_leavingOutsideRangeIntact() {
        writer.replaceListExam(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 7, 31),
                List.of(
                        examRow("A", "2026-06-01", "시력교정"),
                        examRow("B", "2026-06-15", "드림렌즈"),
                        examRow("C", "2026-07-01", "시력교정")
                )
        );

        // 6월 범위만 새 데이터로 교체 (7월 데이터는 유지되어야 함)
        writer.replaceListExam(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of(examRow("X", "2026-06-20", "시력교정"))
        );

        List<Map<String, Object>> all = martRepo.findExamList("2026-06-01", "2026-07-31");
        assertThat(all)
                .extracting(r -> r.get("chartNo") + "|" + r.get("examDate"))
                .containsExactlyInAnyOrder("X|2026-06-20", "C|2026-07-01");
    }

    @Test
    void replaceListExam_emptyRows_stillDeletesRange() {
        writer.replaceListExam(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of(examRow("A", "2026-06-01", "시력교정"))
        );
        int inserted = writer.replaceListExam(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of()
        );
        assertThat(inserted).isZero();
        assertThat(martRepo.findExamList("2026-06-01", "2026-06-30")).isEmpty();
    }

    @Test
    void replaceListCataractExam_isolatedFromListExam() {
        // list_exam에 데이터 넣어도 list_cataract_exam은 영향 없어야 함
        writer.replaceListExam(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of(examRow("A", "2026-06-10", "시력교정"))
        );
        // Cataract 리스트에 별도 데이터
        writer.replaceListCataractExam(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of(examRow("B", "2026-06-15", "백내장"))
        );

        List<Map<String, Object>> examRows = martRepo.findExamList("2026-06-01", "2026-06-30");
        List<Map<String, Object>> cataractRows = martRepo.findCataractExamList("2026-06-01", "2026-06-30");

        assertThat(examRows).hasSize(1);
        assertThat(examRows.get(0).get("chartNo")).isEqualTo("A");
        assertThat(cataractRows).hasSize(1);
        assertThat(cataractRows.get(0).get("chartNo")).isEqualTo("B");
    }

    @Test
    void replaceListCataractExam_emptyRows_stillDeletesRange() {
        writer.replaceListCataractExam(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of(examRow("A", "2026-06-01", "백내장"))
        );
        int inserted = writer.replaceListCataractExam(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30),
                List.of()
        );
        assertThat(inserted).isZero();
        assertThat(martRepo.findCataractExamList("2026-06-01", "2026-06-30")).isEmpty();
    }

    // ─── helpers ─────────────────────────────────────────────

    private static ExaminationMonthlyItem sampleExamination(int yr, int mo, int vision, int dream, int cat) {
        int examTotal = vision + dream + cat;
        return ExaminationMonthlyItem.builder()
                .year(yr).month(mo)
                .visionCorrection(vision).dreamlens(dream).cataract(cat)
                .examTotal(examTotal).total(examTotal)
                .build();
    }

    private static ProcedureExamMonthlyItem sampleProcedureExam(int yr, int mo, int examCount, int oneDay) {
        return ProcedureExamMonthlyItem.builder()
                .year(yr).month(mo)
                .examCount(examCount).oneDayExamCount(oneDay).total(examCount)
                .build();
    }

    private static Map<String, Object> examRow(String chartNo, String examDate, String category) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("examDate", examDate);
        row.put("chartNo", chartNo);
        row.put("name", "환자" + chartNo);
        row.put("examCategory", category);
        // 나머지 44개 필드는 빈 문자열 — Writer가 null 처리
        return row;
    }

    private static void execSilently(Connection conn, String sql) throws Exception {
        try (var st = conn.createStatement()) {
            st.execute(sql);
        }
    }
}
