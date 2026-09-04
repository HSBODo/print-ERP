package com.bviit.analytics.batch.job;

import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;
import com.bviit.analytics.outpatient.repository.OutpatientCountStatsMartRepository;
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
 * 외래 마트 통합 테스트 — Testcontainers Postgres 위에서
 * OutpatientMartWriter가 쓴 값을 OutpatientCountStatsMartRepository가 그대로 읽어내는지 검증.
 *
 * 회귀 방지 대상:
 *   - upsertMonthly:   (yr,mo) 충돌 시 값이 덮어써진다 (idempotent)
 *   - null 필드 저장·조회 라운드트립 (2026 미확인 월 재현)
 */
@EnabledIfEnvironmentVariable(named = "RUN_INTEGRATION_TESTS", matches = "true")
@Testcontainers
class OutpatientMartWriterIT {

    @Container
    @SuppressWarnings("resource") // Lifecycle is managed by Testcontainers.
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("mart_test")
            .withUsername("test")
            .withPassword("test");

    private static HikariDataSource dataSource;

    private NamedParameterJdbcTemplate jdbc;
    private OutpatientMartWriter writer;
    private OutpatientCountStatsMartRepository martRepo;

    @BeforeEach
    void setUp() throws Exception {
        if (dataSource == null) {
            dataSource = new HikariDataSource();
            dataSource.setJdbcUrl(POSTGRES.getJdbcUrl());
            dataSource.setUsername(POSTGRES.getUsername());
            dataSource.setPassword(POSTGRES.getPassword());
        }
        this.jdbc = new NamedParameterJdbcTemplate(dataSource);
        this.writer = new OutpatientMartWriter(jdbc);
        this.martRepo = new OutpatientCountStatsMartRepository(jdbc);

        try (Connection conn = dataSource.getConnection()) {
            execSilently(conn, "DROP TABLE IF EXISTS mart_outpatient_count_monthly, "
                    + "batch_watermark, batch_run_log CASCADE");
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/batch/tables/V1a__batch_run_log.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/batch/tables/V1b__batch_watermark.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/outpatient/tables/V6__outpatient_mart.sql"));
        }
    }

    @AfterAll
    static void tearDown() {
        if (dataSource != null) dataSource.close();
    }

    @Test
    void upsertMonthly_writesAndIsIdempotent() {
        OutpatientCountMonthlyItem v1 = OutpatientCountMonthlyItem.builder()
                .year(2025).month(3).outpatientCount(4933).total(4933).build();
        int rows1 = writer.upsertMonthly(List.of(v1));
        assertThat(rows1).isEqualTo(1);

        List<OutpatientCountMonthlyItem> read = martRepo.findMonthly(List.of(2025));
        assertThat(read).hasSize(1);
        assertThat(read.get(0).getOutpatientCount()).isEqualTo(4933);
        assertThat(read.get(0).getTotal()).isEqualTo(4933);

        // 덮어쓰기
        OutpatientCountMonthlyItem v2 = OutpatientCountMonthlyItem.builder()
                .year(2025).month(3).outpatientCount(5000).total(5000).build();
        writer.upsertMonthly(List.of(v2));
        assertThat(martRepo.findMonthly(List.of(2025)).get(0).getOutpatientCount()).isEqualTo(5000);
    }

    @Test
    void upsertMonthly_nullFieldsPreservedThroughRoundTrip() {
        // 2026 미확인 월 = outpatientCount·total null 저장
        OutpatientCountMonthlyItem nullRow = OutpatientCountMonthlyItem.builder()
                .year(2026).month(5).outpatientCount(null).total(null).build();
        writer.upsertMonthly(List.of(nullRow));

        List<OutpatientCountMonthlyItem> read = martRepo.findMonthly(List.of(2026));
        assertThat(read).hasSize(1);
        assertThat(read.get(0).getOutpatientCount()).isNull();
        assertThat(read.get(0).getTotal()).isNull();

        // null → 값으로 덮어쓰기 (라이브 데이터 도착)
        OutpatientCountMonthlyItem valueRow = OutpatientCountMonthlyItem.builder()
                .year(2026).month(5).outpatientCount(3800).total(3800).build();
        writer.upsertMonthly(List.of(valueRow));
        assertThat(martRepo.findMonthly(List.of(2026)).get(0).getOutpatientCount()).isEqualTo(3800);

        // 값 → null로 되돌리기
        writer.upsertMonthly(List.of(nullRow));
        assertThat(martRepo.findMonthly(List.of(2026)).get(0).getOutpatientCount()).isNull();
    }

    private static void execSilently(Connection conn, String sql) throws Exception {
        try (var st = conn.createStatement()) {
            st.execute(sql);
        }
    }
}
