package com.bviit.analytics.batch.job;

import com.bviit.analytics.consultation.dto.CataractReservationRateItem;
import com.bviit.analytics.consultation.dto.ConsultationRateItem;
import com.bviit.analytics.consultation.dto.StopReasonMonthlyItem;
import com.bviit.analytics.consultation.repository.ConsultationStatsMartRepository;
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
 * 전환·성공률 마트 통합 테스트 — Testcontainers Postgres 위에서
 * ConsultationMartWriter가 쓴 값을 ConsultationStatsMartRepository가 그대로 읽어내는지 검증.
 *
 * 회귀 방지 대상:
 *   - upsertConsultationRateMonthly:   (yr,mo) 충돌 시 값이 덮어써진다 (idempotent + roundtrip 14개 필드)
 *   - upsertStopReasonMonthly:         (yr,mo) 충돌 시 값이 덮어써진다 (idempotent + roundtrip 8개 사유+total)
 *   - upsertReservationRateMonthly:    (yr,mo,category) 격리 — vision·cataract가 서로 덮어쓰지 않음
 *
 * Spring 컨텍스트 없이 실제 DDL + JdbcTemplate만 사용해 빠르게 돈다.
 */
@EnabledIfEnvironmentVariable(named = "RUN_INTEGRATION_TESTS", matches = "true")
@Testcontainers
class ConsultationMartWriterIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("mart_test")
            .withUsername("test")
            .withPassword("test");

    private static HikariDataSource dataSource;

    private NamedParameterJdbcTemplate jdbc;
    private ConsultationMartWriter writer;
    private ConsultationStatsMartRepository martRepo;

    @BeforeEach
    void setUp() throws Exception {
        if (dataSource == null) {
            dataSource = new HikariDataSource();
            dataSource.setJdbcUrl(POSTGRES.getJdbcUrl());
            dataSource.setUsername(POSTGRES.getUsername());
            dataSource.setPassword(POSTGRES.getPassword());
        }
        this.jdbc = new NamedParameterJdbcTemplate(dataSource);
        this.writer = new ConsultationMartWriter(jdbc);
        this.martRepo = new ConsultationStatsMartRepository(jdbc);

        try (Connection conn = dataSource.getConnection()) {
            execSilently(conn, "DROP TABLE IF EXISTS mart_reservation_rate_monthly, "
                    + "mart_stop_reason_monthly, mart_consultation_rate_monthly, "
                    + "batch_watermark, batch_run_log CASCADE");
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/V1__batch_meta.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/V5__consultation_mart.sql"));
        }
    }

    @AfterAll
    static void tearDown() {
        if (dataSource != null) dataSource.close();
    }

    @Test
    void upsertConsultationRateMonthly_writesAndIsIdempotent_allFieldsPreserved() {
        ConsultationRateItem in = ConsultationRateItem.builder()
                .year(2026).month(6)
                .visionExamCount(100).visionCounselCount(80)
                .visionSurgeryBooked(50).visionActualSurgery(45)
                .visionSurgeryRate(50.0).visionCounselRate(62.5)
                .visionCounselRateOneday(70.0).visionCounselRateGeneral(55.0)
                .visionGeneralBookRate(48.5)
                .cataractExamCount(30).cataractSurgeryBooked(18)
                .cataractStoppedCount(2).cataractSurgeryRate(60.0)
                .build();
        int rows1 = writer.upsertConsultationRateMonthly(List.of(in));
        assertThat(rows1).isEqualTo(1);

        ConsultationRateItem out = martRepo.findConsultationRateMonthly(List.of(2026)).get(0);
        assertThat(out.getYear()).isEqualTo(2026);
        assertThat(out.getMonth()).isEqualTo(6);
        assertThat(out.getVisionExamCount()).isEqualTo(100);
        assertThat(out.getVisionCounselCount()).isEqualTo(80);
        assertThat(out.getVisionSurgeryBooked()).isEqualTo(50);
        assertThat(out.getVisionActualSurgery()).isEqualTo(45);
        assertThat(out.getVisionSurgeryRate()).isEqualTo(50.0);
        assertThat(out.getVisionCounselRate()).isEqualTo(62.5);
        assertThat(out.getVisionCounselRateOneday()).isEqualTo(70.0);
        assertThat(out.getVisionCounselRateGeneral()).isEqualTo(55.0);
        assertThat(out.getVisionGeneralBookRate()).isEqualTo(48.5);
        assertThat(out.getCataractExamCount()).isEqualTo(30);
        assertThat(out.getCataractSurgeryBooked()).isEqualTo(18);
        assertThat(out.getCataractStoppedCount()).isEqualTo(2);
        assertThat(out.getCataractSurgeryRate()).isEqualTo(60.0);

        // 동일 (yr,mo)를 다른 값으로 upsert → 덮어써진다
        ConsultationRateItem in2 = ConsultationRateItem.builder()
                .year(2026).month(6)
                .visionExamCount(200).visionCounselCount(160)
                .visionSurgeryBooked(100).visionActualSurgery(90)
                .visionSurgeryRate(50.0).visionCounselRate(62.5)
                .visionCounselRateOneday(70.0).visionCounselRateGeneral(55.0)
                .visionGeneralBookRate(48.5)
                .cataractExamCount(60).cataractSurgeryBooked(36)
                .cataractStoppedCount(4).cataractSurgeryRate(60.0)
                .build();
        writer.upsertConsultationRateMonthly(List.of(in2));
        ConsultationRateItem after = martRepo.findConsultationRateMonthly(List.of(2026)).get(0);
        assertThat(after.getVisionExamCount()).isEqualTo(200);
        assertThat(after.getCataractExamCount()).isEqualTo(60);
    }

    @Test
    void upsertStopReasonMonthly_writesAndIsIdempotent() {
        StopReasonMonthlyItem v1 = StopReasonMonthlyItem.builder()
                .year(2025).month(3)
                .recommendX(1).lensImpossible(2).keratoconus(3).avellino(4)
                .glaucoma(5).visionChange(6).other(7).total(28)
                .build();
        int rows1 = writer.upsertStopReasonMonthly(List.of(v1));
        assertThat(rows1).isEqualTo(1);

        StopReasonMonthlyItem out = martRepo.findStopReasonMonthly(List.of(2025)).get(0);
        assertThat(out.getRecommendX()).isEqualTo(1);
        assertThat(out.getLensImpossible()).isEqualTo(2);
        assertThat(out.getKeratoconus()).isEqualTo(3);
        assertThat(out.getAvellino()).isEqualTo(4);
        assertThat(out.getGlaucoma()).isEqualTo(5);
        assertThat(out.getVisionChange()).isEqualTo(6);
        assertThat(out.getOther()).isEqualTo(7);
        assertThat(out.getTotal()).isEqualTo(28);

        // 덮어쓰기
        StopReasonMonthlyItem v2 = StopReasonMonthlyItem.builder()
                .year(2025).month(3)
                .recommendX(10).lensImpossible(20).keratoconus(30).avellino(40)
                .glaucoma(50).visionChange(60).other(70).total(280)
                .build();
        writer.upsertStopReasonMonthly(List.of(v2));
        StopReasonMonthlyItem after = martRepo.findStopReasonMonthly(List.of(2025)).get(0);
        assertThat(after.getTotal()).isEqualTo(280);
    }

    @Test
    void upsertReservationRateMonthly_categoriesAreIsolated() {
        CataractReservationRateItem visionRow = CataractReservationRateItem.builder()
                .year(2026).month(5)
                .examCount(300).surgeryBookedCount(120).reservationRate(40.0)
                .build();
        CataractReservationRateItem cataractRow = CataractReservationRateItem.builder()
                .year(2026).month(5)
                .examCount(50).surgeryBookedCount(30).reservationRate(60.0)
                .build();

        writer.upsertReservationRateMonthly("vision", List.of(visionRow));
        writer.upsertReservationRateMonthly("cataract", List.of(cataractRow));

        List<CataractReservationRateItem> visionOut =
                martRepo.findReservationRateMonthly(List.of(2026), "vision");
        List<CataractReservationRateItem> cataractOut =
                martRepo.findReservationRateMonthly(List.of(2026), "cataract");

        assertThat(visionOut).hasSize(1);
        assertThat(visionOut.get(0).getExamCount()).isEqualTo(300);
        assertThat(visionOut.get(0).getReservationRate()).isEqualTo(40.0);

        assertThat(cataractOut).hasSize(1);
        assertThat(cataractOut.get(0).getExamCount()).isEqualTo(50);
        assertThat(cataractOut.get(0).getReservationRate()).isEqualTo(60.0);
    }

    @Test
    void upsertReservationRateMonthly_upsertOverwritesWithinCategory() {
        CataractReservationRateItem v1 = CataractReservationRateItem.builder()
                .year(2026).month(5).examCount(100).surgeryBookedCount(40).reservationRate(40.0).build();
        writer.upsertReservationRateMonthly("cataract", List.of(v1));

        CataractReservationRateItem v2 = CataractReservationRateItem.builder()
                .year(2026).month(5).examCount(200).surgeryBookedCount(80).reservationRate(40.0).build();
        writer.upsertReservationRateMonthly("cataract", List.of(v2));

        List<CataractReservationRateItem> after =
                martRepo.findReservationRateMonthly(List.of(2026), "cataract");
        assertThat(after).hasSize(1);
        assertThat(after.get(0).getExamCount()).isEqualTo(200);
        assertThat(after.get(0).getSurgeryBookedCount()).isEqualTo(80);
    }

    private static void execSilently(Connection conn, String sql) throws Exception {
        try (var st = conn.createStatement()) {
            st.execute(sql);
        }
    }
}
