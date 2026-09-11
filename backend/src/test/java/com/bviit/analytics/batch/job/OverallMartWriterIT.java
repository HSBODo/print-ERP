package com.bviit.analytics.batch.job;

import com.bviit.analytics.overall.dto.OverallExamMonthlyItem;
import com.bviit.analytics.overall.dto.OverallExamWeeklyItem;
import com.bviit.analytics.overall.repository.OverallExamMartRepository;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 전체지표 마트 통합 테스트 — Testcontainers Postgres 위에서
 * OverallMartWriter가 쓴 값을 OverallExamMartRepository가 그대로 읽어내는지 검증.
 *
 * 회귀 방지 대상:
 *   - upsertWeekly:   (yr,mo,wk) 충돌 시 값이 덮어써진다 (idempotent + 17개 지표 roundtrip)
 *   - upsertMonthly:  (yr,mo) 충돌 시 값이 덮어써진다 (idempotent + 16개 지표 roundtrip)
 *   - partial 플래그 · 날짜 라운드트립 (부분 주/월 재현)
 *   - 여러 주/월에 걸친 upsert
 */
@EnabledIfEnvironmentVariable(named = "RUN_INTEGRATION_TESTS", matches = "true")
@Testcontainers
class OverallMartWriterIT {

    @Container
    @SuppressWarnings("resource") // Lifecycle is managed by Testcontainers.
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("mart_test")
            .withUsername("test")
            .withPassword("test");

    private static HikariDataSource dataSource;

    private NamedParameterJdbcTemplate jdbc;
    private OverallMartWriter writer;
    private OverallExamMartRepository martRepo;

    @BeforeEach
    void setUp() throws Exception {
        if (dataSource == null) {
            dataSource = new HikariDataSource();
            dataSource.setJdbcUrl(POSTGRES.getJdbcUrl());
            dataSource.setUsername(POSTGRES.getUsername());
            dataSource.setPassword(POSTGRES.getPassword());
        }
        this.jdbc = new NamedParameterJdbcTemplate(dataSource);
        this.writer = new OverallMartWriter(jdbc);
        this.martRepo = new OverallExamMartRepository(jdbc);

        try (Connection conn = dataSource.getConnection()) {
            execSilently(conn, "DROP TABLE IF EXISTS mart_overall_exam_weekly, "
                    + "mart_overall_exam_monthly, batch_watermark, batch_run_log CASCADE");
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/batch/tables/V1a__batch_run_log.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/batch/tables/V1b__batch_watermark.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/overall/tables/V7__overall_mart.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/exam/tables/V10__overall_exam_monthly.sql"));
        }
    }

    @AfterAll
    static void tearDown() {
        if (dataSource != null) dataSource.close();
    }

    @Test
    void upsertWeekly_writesAndIsIdempotent_allFieldsPreserved() {
        OverallExamWeeklyItem v1 = fullItem(2026, 6, 2, false, "2026-06-08", "2026-06-14", 100);
        int rows1 = writer.upsertWeekly(List.of(v1));
        assertThat(rows1).isEqualTo(1);

        OverallExamWeeklyItem out = martRepo.findWeekly(List.of(2026)).get(0);
        assertThat(out.getYear()).isEqualTo(2026);
        assertThat(out.getMonth()).isEqualTo(6);
        assertThat(out.getWeek()).isEqualTo(2);
        assertThat(out.isPartial()).isFalse();
        assertThat(out.getStartDate()).isEqualTo("2026-06-08");
        assertThat(out.getEndDate()).isEqualTo("2026-06-14");
        assertThat(out.getTotalExam()).isEqualTo(100);
        assertThat(out.getIntroGeneral()).isEqualTo(11);
        assertThat(out.getIntroCustomer()).isEqualTo(12);
        assertThat(out.getIntroStaff()).isEqualTo(13);
        assertThat(out.getJobOffice()).isEqualTo(14);
        assertThat(out.getJobStudent()).isEqualTo(15);
        assertThat(out.getJobEtc()).isEqualTo(16);
        assertThat(out.getVisionBooked()).isEqualTo(17);
        assertThat(out.getCataractTotal()).isEqualTo(18);
        assertThat(out.getCataractOnly()).isEqualTo(19);
        assertThat(out.getCataractBooked()).isEqualTo(20);
        assertThat(out.getStopCount()).isEqualTo(21);
        assertThat(out.getVisionExam()).isEqualTo(22);
        assertThat(out.getDreamlens()).isEqualTo(23);
        assertThat(out.getOneDay()).isEqualTo(24);
        assertThat(out.getOneDayBooked()).isEqualTo(25);

        // 덮어쓰기
        OverallExamWeeklyItem v2 = fullItem(2026, 6, 2, false, "2026-06-08", "2026-06-14", 200);
        writer.upsertWeekly(List.of(v2));
        assertThat(martRepo.findWeekly(List.of(2026)).get(0).getTotalExam()).isEqualTo(200);
    }

    @Test
    void upsertWeekly_partialWeekAtMonthBoundary() {
        // 6/29(월) ~ 6/30(화) → 6월 마지막 partial 주
        OverallExamWeeklyItem juneEnd = fullItem(2026, 6, 5, true, "2026-06-29", "2026-06-30", 40);
        // 7/1(수) ~ 7/5(일) → 7월 첫 partial 주 (첫 주는 1일~첫 일요일이라 partial 아님)
        OverallExamWeeklyItem julyStart = fullItem(2026, 7, 1, false, "2026-07-01", "2026-07-05", 60);
        writer.upsertWeekly(List.of(juneEnd, julyStart));

        List<OverallExamWeeklyItem> all = martRepo.findWeekly(List.of(2026));
        assertThat(all).hasSize(2);
        assertThat(all.get(0).getMonth()).isEqualTo(6);
        assertThat(all.get(0).isPartial()).isTrue();
        assertThat(all.get(1).getMonth()).isEqualTo(7);
        assertThat(all.get(1).isPartial()).isFalse();
    }

    @Test
    void upsertWeekly_multipleWeeksOrderedByPk() {
        OverallExamWeeklyItem w1 = fullItem(2026, 6, 1, false, "2026-06-01", "2026-06-07", 10);
        OverallExamWeeklyItem w2 = fullItem(2026, 6, 2, false, "2026-06-08", "2026-06-14", 20);
        OverallExamWeeklyItem w3 = fullItem(2026, 7, 1, false, "2026-07-01", "2026-07-05", 30);
        writer.upsertWeekly(List.of(w3, w1, w2));

        List<OverallExamWeeklyItem> read = martRepo.findWeekly(List.of(2026));
        assertThat(read).hasSize(3);
        // select ORDER BY yr, mo, wk 로 정렬됨
        assertThat(read).extracting(OverallExamWeeklyItem::getTotalExam)
                .containsExactly(10, 20, 30);
    }

    @Test
    void upsertMonthly_writesAndIsIdempotent_allFieldsPreserved() {
        OverallExamMonthlyItem v1 = fullMonthlyItem(2026, 6, false, 500);
        int rows1 = writer.upsertMonthly(List.of(v1));
        assertThat(rows1).isEqualTo(1);

        OverallExamMonthlyItem out = martRepo.findMonthly(List.of(2026)).get(0);
        assertThat(out.getYear()).isEqualTo(2026);
        assertThat(out.getMonth()).isEqualTo(6);
        assertThat(out.isPartial()).isFalse();
        assertThat(out.getTotalExam()).isEqualTo(500);
        assertThat(out.getIntroGeneral()).isEqualTo(11);
        assertThat(out.getIntroCustomer()).isEqualTo(12);
        assertThat(out.getIntroStaff()).isEqualTo(13);
        assertThat(out.getJobOffice()).isEqualTo(14);
        assertThat(out.getJobStudent()).isEqualTo(15);
        assertThat(out.getJobEtc()).isEqualTo(16);
        assertThat(out.getVisionBooked()).isEqualTo(17);
        assertThat(out.getCataractTotal()).isEqualTo(18);
        assertThat(out.getCataractOnly()).isEqualTo(19);
        assertThat(out.getCataractBooked()).isEqualTo(20);
        assertThat(out.getStopCount()).isEqualTo(21);
        assertThat(out.getVisionExam()).isEqualTo(22);
        assertThat(out.getDreamlens()).isEqualTo(23);
        assertThat(out.getOneDay()).isEqualTo(24);
        assertThat(out.getOneDayBooked()).isEqualTo(25);

        // 덮어쓰기
        OverallExamMonthlyItem v2 = fullMonthlyItem(2026, 6, true, 800);
        writer.upsertMonthly(List.of(v2));
        OverallExamMonthlyItem out2 = martRepo.findMonthly(List.of(2026)).get(0);
        assertThat(out2.getTotalExam()).isEqualTo(800);
        assertThat(out2.isPartial()).isTrue();
    }

    @Test
    void upsertMonthly_multipleMonthsOrderedByPk() {
        OverallExamMonthlyItem m1 = fullMonthlyItem(2026, 6, false, 100);
        OverallExamMonthlyItem m2 = fullMonthlyItem(2026, 7, true, 200);
        OverallExamMonthlyItem m3 = fullMonthlyItem(2027, 1, false, 300);
        writer.upsertMonthly(List.of(m3, m1, m2));

        List<OverallExamMonthlyItem> read = martRepo.findMonthly(List.of(2026, 2027));
        assertThat(read).hasSize(3);
        // select ORDER BY yr, mo 로 정렬됨
        assertThat(read).extracting(OverallExamMonthlyItem::getTotalExam)
                .containsExactly(100, 200, 300);
    }

    // ─── helpers ─────────────────────────────────────────────

    private static OverallExamWeeklyItem fullItem(int year, int month, int week, boolean partial,
                                                   String startDate, String endDate, int totalExam) {
        return OverallExamWeeklyItem.builder()
                .year(year).month(month).week(week).partial(partial)
                .startDate(startDate).endDate(endDate)
                .totalExam(totalExam)
                .introGeneral(11).introCustomer(12).introStaff(13)
                .jobOffice(14).jobStudent(15).jobEtc(16)
                .visionBooked(17).cataractTotal(18).cataractOnly(19).cataractBooked(20)
                .stopCount(21).visionExam(22).dreamlens(23)
                .oneDay(24).oneDayBooked(25)
                .build();
    }

    private static OverallExamMonthlyItem fullMonthlyItem(int year, int month, boolean partial, int totalExam) {
        return OverallExamMonthlyItem.builder()
                .year(year).month(month).partial(partial)
                .totalExam(totalExam)
                .introGeneral(11).introCustomer(12).introStaff(13)
                .jobOffice(14).jobStudent(15).jobEtc(16)
                .visionBooked(17).cataractTotal(18).cataractOnly(19).cataractBooked(20)
                .stopCount(21).visionExam(22).dreamlens(23)
                .oneDay(24).oneDayBooked(25)
                .build();
    }

    private static void execSilently(Connection conn, String sql) throws Exception {
        try (var st = conn.createStatement()) {
            st.execute(sql);
        }
    }
}
