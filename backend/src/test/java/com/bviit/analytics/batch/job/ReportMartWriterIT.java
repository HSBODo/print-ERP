package com.bviit.analytics.batch.job;

import com.bviit.analytics.exam.repository.ExamCountMartRepository;
import com.bviit.analytics.report.dto.WeeklyReportItem;
import com.bviit.analytics.report.repository.WeeklyReportMartRepository;
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
 * 레포트 마트 통합 테스트 — Testcontainers Postgres 위에서
 * ReportMartWriter 가 쓴 값을 마트 Repository 가 그대로 읽어내는지 검증.
 *
 * 회귀 방지 대상:
 *   - upsertWeekly: (yr,wk) 충돌 시 덮어쓰기 + 27개 필드 roundtrip
 *   - null 보존 — "알 수 없음"(null)이 0 으로 뭉개지지 않아야 프론트가 선을 끊을 수 있다
 *   - upsertExamCountByClass: (yr,mo,motive_report) 충돌 시 덮어쓰기
 *   - ORDER BY 로 내려오는 정렬
 */
@EnabledIfEnvironmentVariable(named = "RUN_INTEGRATION_TESTS", matches = "true")
@Testcontainers
class ReportMartWriterIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("mart_test")
            .withUsername("test")
            .withPassword("test");

    private static HikariDataSource dataSource;

    private ReportMartWriter writer;
    private WeeklyReportMartRepository weeklyRepo;
    private ExamCountMartRepository byClassRepo;

    @BeforeEach
    void setUp() throws Exception {
        if (dataSource == null) {
            dataSource = new HikariDataSource();
            dataSource.setJdbcUrl(POSTGRES.getJdbcUrl());
            dataSource.setUsername(POSTGRES.getUsername());
            dataSource.setPassword(POSTGRES.getPassword());
        }
        NamedParameterJdbcTemplate jdbc = new NamedParameterJdbcTemplate(dataSource);
        this.writer = new ReportMartWriter(jdbc);
        this.weeklyRepo = new WeeklyReportMartRepository(jdbc);
        this.byClassRepo = new ExamCountMartRepository(jdbc);

        try (Connection conn = dataSource.getConnection()) {
            execSilently(conn, "DROP TABLE IF EXISTS mart_weekly_report, mart_exam_count_by_class CASCADE");
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/report/tables/V28a__mart_weekly_report.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/report/tables/V28b__mart_exam_count_by_class.sql"));
        }
    }

    @AfterAll
    static void tearDown() {
        if (dataSource != null) dataSource.close();
    }

    @Test
    void upsertWeekly_writesAndIsIdempotent_allFieldsPreserved() {
        writer.upsertWeekly(List.of(fullWeek(2026, 23, "2026-06-01", "2026-06-07", 100)));

        WeeklyReportItem out = weeklyRepo.findWeekly(List.of(2026)).get(0);
        assertThat(out.getYear()).isEqualTo(2026);
        assertThat(out.getWeek()).isEqualTo(23);
        assertThat(out.getStartDate()).isEqualTo("2026-06-01");
        assertThat(out.getEndDate()).isEqualTo("2026-06-07");
        assertThat(out.getReservations()).isEqualTo(100);
        assertThat(out.getCall()).isEqualTo(11);
        assertThat(out.getOnline()).isEqualTo(12);
        assertThat(out.getIntroGeneral()).isEqualTo(13);
        assertThat(out.getIntroCustomer()).isEqualTo(14);
        assertThat(out.getIntroStaff()).isEqualTo(15);
        assertThat(out.getJobOffice()).isEqualTo(16);
        assertThat(out.getJobStudent()).isEqualTo(17);
        assertThat(out.getJobEtc()).isEqualTo(18);
        assertThat(out.getExamTotal()).isEqualTo(19);
        assertThat(out.getVisionExam()).isEqualTo(20);
        assertThat(out.getCataractExam()).isEqualTo(21);
        assertThat(out.getOneDay()).isEqualTo(22);
        assertThat(out.getVisionBooked()).isEqualTo(23);
        assertThat(out.getCataractBooked()).isEqualTo(25);
        assertThat(out.getOneDayBooked()).isEqualTo(26);
        assertThat(out.getStopCount()).isEqualTo(27);
        assertThat(out.getExamGeneralBase()).isEqualTo(28);
        assertThat(out.getBookedGeneral()).isEqualTo(29);
        assertThat(out.getVisionSurgery()).isEqualTo(30);
        assertThat(out.getCataractSurgery()).isEqualTo(31);
        assertThat(out.getTotalSurgery()).isEqualTo(32);
        assertThat(out.getOutpatient()).isEqualTo(33);

        // 같은 (yr, wk) 재적재 → 덮어쓰기, 행은 늘지 않는다
        writer.upsertWeekly(List.of(fullWeek(2026, 23, "2026-06-01", "2026-06-07", 999)));
        List<WeeklyReportItem> after = weeklyRepo.findWeekly(List.of(2026));
        assertThat(after).hasSize(1);
        assertThat(after.get(0).getReservations()).isEqualTo(999);
    }

    @Test
    void upsertWeekly_preservesNullAsUnknown() {
        WeeklyReportItem onlyUnknown = WeeklyReportItem.builder()
                .year(2026).week(1).startDate("2025-12-29").endDate("2026-01-04")
                .reservations(10)
                .online(null)      // 홈페이지 소스 미연결 구간 — 0 이 아니라 "알 수 없음"
                .outpatient(0)     // 진짜 0
                .build();
        writer.upsertWeekly(List.of(onlyUnknown));

        WeeklyReportItem out = weeklyRepo.findWeekly(List.of(2026)).get(0);
        assertThat(out.getOnline()).isNull();
        assertThat(out.getOutpatient()).isZero();
        assertThat(out.getCall()).isNull();
    }

    @Test
    void upsertWeekly_isoWeekOneCanStartInPreviousYear() {
        // ISO 2026-W01 = 2025-12-29(월)~2026-01-04(일). 주차연도(2026)로 귀속돼야 한다.
        writer.upsertWeekly(List.of(fullWeek(2026, 1, "2025-12-29", "2026-01-04", 5)));

        List<WeeklyReportItem> read = weeklyRepo.findWeekly(List.of(2026));
        assertThat(read).hasSize(1);
        assertThat(read.get(0).getStartDate()).isEqualTo("2025-12-29");
        assertThat(weeklyRepo.findWeekly(List.of(2025))).isEmpty();
    }

    @Test
    void upsertWeekly_multipleWeeksOrderedByPk() {
        writer.upsertWeekly(List.of(
                fullWeek(2026, 30, "2026-07-20", "2026-07-26", 30),
                fullWeek(2026, 10, "2026-03-02", "2026-03-08", 10),
                fullWeek(2026, 20, "2026-05-11", "2026-05-17", 20)));

        assertThat(weeklyRepo.findWeekly(List.of(2026)))
                .extracting(WeeklyReportItem::getReservations)
                .containsExactly(10, 20, 30);
    }

    @Test
    void upsertExamCountByClass_writesAndIsIdempotent() {
        writer.upsertExamCountByClass(2026, List.of(
                Map.of("month", 6, "motiveReport", "소개고객", "cnt", 408),
                Map.of("month", 6, "motiveReport", "홈페이지", "cnt", 210)));

        List<Map<String, Object>> read = byClassRepo.findExamCountByClassMonthly(2026);
        assertThat(read).hasSize(2);
        assertThat(read.get(0)).containsEntry("month", 6).containsEntry("motiveReport", "소개고객");
        assertThat(read.get(0)).containsEntry("cnt", 408);

        // 같은 (yr, mo, motiveReport) 재적재 → 덮어쓰기
        writer.upsertExamCountByClass(2026, List.of(
                Map.of("month", 6, "motiveReport", "소개고객", "cnt", 500)));
        List<Map<String, Object>> after = byClassRepo.findExamCountByClassMonthly(2026);
        assertThat(after).hasSize(2);
        assertThat(after.get(0)).containsEntry("cnt", 500);
    }

    @Test
    void upsertExamCountByClass_isolatesYears() {
        writer.upsertExamCountByClass(2026, List.of(Map.of("month", 1, "motiveReport", "광고", "cnt", 1)));
        writer.upsertExamCountByClass(2025, List.of(Map.of("month", 1, "motiveReport", "광고", "cnt", 2)));

        assertThat(byClassRepo.findExamCountByClassMonthly(2026).get(0)).containsEntry("cnt", 1);
        assertThat(byClassRepo.findExamCountByClassMonthly(2025).get(0)).containsEntry("cnt", 2);
    }

    // ─── helpers ─────────────────────────────────────────────

    private static WeeklyReportItem fullWeek(int year, int week, String start, String end, int reservations) {
        return WeeklyReportItem.builder()
                .year(year).week(week).startDate(start).endDate(end)
                .reservations(reservations).call(11).online(12)
                .introGeneral(13).introCustomer(14).introStaff(15)
                .jobOffice(16).jobStudent(17).jobEtc(18)
                .examTotal(19).visionExam(20).cataractExam(21).oneDay(22)
                .visionBooked(23).cataractBooked(25).oneDayBooked(26)
                .stopCount(27).examGeneralBase(28).bookedGeneral(29)
                .visionSurgery(30).cataractSurgery(31).totalSurgery(32)
                .outpatient(33)
                .build();
    }

    private static void execSilently(Connection conn, String sql) throws Exception {
        try (var st = conn.createStatement()) {
            st.execute(sql);
        }
    }
}
