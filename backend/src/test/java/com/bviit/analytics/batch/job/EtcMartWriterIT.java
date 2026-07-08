package com.bviit.analytics.batch.job;

import com.bviit.analytics.etc.dto.B2bRevenueMonthlyItem;
import com.bviit.analytics.etc.repository.B2bRevenueStatsMartRepository;
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
 * 기타 도메인(B2B) 마트 통합 테스트 — Testcontainers Postgres 위에서
 * EtcMartWriter가 쓴 값을 B2bRevenueStatsMartRepository가 그대로 읽어내는지 검증.
 *
 * 회귀 방지 대상:
 *   - upsertB2bRevenueMonthly:  (yr,mo) 충돌 시 값이 덮어써진다 (idempotent + 18개 지표 roundtrip)
 *   - 큰 금액(원 단위 총매출 억 단위) INTEGER 저장 라운드트립
 */
@EnabledIfEnvironmentVariable(named = "RUN_INTEGRATION_TESTS", matches = "true")
@Testcontainers
class EtcMartWriterIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("mart_test")
            .withUsername("test")
            .withPassword("test");

    private static HikariDataSource dataSource;

    private NamedParameterJdbcTemplate jdbc;
    private EtcMartWriter writer;
    private B2bRevenueStatsMartRepository martRepo;

    @BeforeEach
    void setUp() throws Exception {
        if (dataSource == null) {
            dataSource = new HikariDataSource();
            dataSource.setJdbcUrl(POSTGRES.getJdbcUrl());
            dataSource.setUsername(POSTGRES.getUsername());
            dataSource.setPassword(POSTGRES.getPassword());
        }
        this.jdbc = new NamedParameterJdbcTemplate(dataSource);
        this.writer = new EtcMartWriter(jdbc);
        this.martRepo = new B2bRevenueStatsMartRepository(jdbc);

        try (Connection conn = dataSource.getConnection()) {
            execSilently(conn, "DROP TABLE IF EXISTS mart_b2b_revenue_monthly, "
                    + "batch_watermark, batch_run_log CASCADE");
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/V1__batch_meta.sql"));
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("sql/mart/V8__etc_mart.sql"));
        }
    }

    @AfterAll
    static void tearDown() {
        if (dataSource != null) dataSource.close();
    }

    @Test
    void upsertB2bRevenueMonthly_writesAndIsIdempotent_allFieldsPreserved() {
        B2bRevenueMonthlyItem in = fullItem(2026, 6);
        int rows1 = writer.upsertB2bRevenueMonthly(List.of(in));
        assertThat(rows1).isEqualTo(1);

        B2bRevenueMonthlyItem out = martRepo.findMonthly(List.of(2026)).get(0);
        assertThat(out.getYear()).isEqualTo(2026);
        assertThat(out.getMonth()).isEqualTo(6);
        assertThat(out.getTotalRevenue()).isEqualTo(120_000_000);
        assertThat(out.getCaseCount()).isEqualTo(40);
        assertThat(out.getAvgRevenuePerCase()).isEqualTo(3_000_000);
        assertThat(out.getVisionRevenue()).isEqualTo(80_000_000);
        assertThat(out.getCataractRevenue()).isEqualTo(40_000_000);
        assertThat(out.getVisionCount()).isEqualTo(30);
        assertThat(out.getCataractCount()).isEqualTo(10);
        assertThat(out.getDesignatedRevenue()).isEqualTo(70_000_000);
        assertThat(out.getNonDesignatedRevenue()).isEqualTo(50_000_000);
        assertThat(out.getDesignatedCount()).isEqualTo(25);
        assertThat(out.getNonDesignatedCount()).isEqualTo(15);
        assertThat(out.getOpCost()).isEqualTo(90_000_000);
        assertThat(out.getExamCost()).isEqualTo(10_000_000);
        assertThat(out.getDnaCost()).isEqualTo(5_000_000);
        assertThat(out.getPrpCost()).isEqualTo(4_000_000);
        assertThat(out.getEtcCost()).isEqualTo(3_000_000);
        assertThat(out.getPresbyopiaCost()).isEqualTo(6_000_000);
        assertThat(out.getHospitalSupplyCost()).isEqualTo(2_000_000);

        // 덮어쓰기
        B2bRevenueMonthlyItem in2 = B2bRevenueMonthlyItem.builder()
                .year(2026).month(6)
                .totalRevenue(200_000_000).caseCount(60).avgRevenuePerCase(3_333_333)
                .visionRevenue(0).cataractRevenue(0).visionCount(0).cataractCount(0)
                .designatedRevenue(0).nonDesignatedRevenue(0).designatedCount(0).nonDesignatedCount(0)
                .opCost(0).examCost(0).dnaCost(0).prpCost(0).etcCost(0)
                .presbyopiaCost(0).hospitalSupplyCost(0)
                .build();
        writer.upsertB2bRevenueMonthly(List.of(in2));
        assertThat(martRepo.findMonthly(List.of(2026)).get(0).getTotalRevenue()).isEqualTo(200_000_000);
        assertThat(martRepo.findMonthly(List.of(2026)).get(0).getCaseCount()).isEqualTo(60);
    }

    @Test
    void upsertB2bRevenueMonthly_multipleMonthsOrdered() {
        writer.upsertB2bRevenueMonthly(List.of(
                B2bRevenueMonthlyItem.builder().year(2026).month(3)
                        .totalRevenue(1).caseCount(0).avgRevenuePerCase(0)
                        .visionRevenue(0).cataractRevenue(0).visionCount(0).cataractCount(0)
                        .designatedRevenue(0).nonDesignatedRevenue(0).designatedCount(0).nonDesignatedCount(0)
                        .opCost(0).examCost(0).dnaCost(0).prpCost(0).etcCost(0)
                        .presbyopiaCost(0).hospitalSupplyCost(0)
                        .build(),
                B2bRevenueMonthlyItem.builder().year(2026).month(1)
                        .totalRevenue(3).caseCount(0).avgRevenuePerCase(0)
                        .visionRevenue(0).cataractRevenue(0).visionCount(0).cataractCount(0)
                        .designatedRevenue(0).nonDesignatedRevenue(0).designatedCount(0).nonDesignatedCount(0)
                        .opCost(0).examCost(0).dnaCost(0).prpCost(0).etcCost(0)
                        .presbyopiaCost(0).hospitalSupplyCost(0)
                        .build(),
                B2bRevenueMonthlyItem.builder().year(2026).month(2)
                        .totalRevenue(2).caseCount(0).avgRevenuePerCase(0)
                        .visionRevenue(0).cataractRevenue(0).visionCount(0).cataractCount(0)
                        .designatedRevenue(0).nonDesignatedRevenue(0).designatedCount(0).nonDesignatedCount(0)
                        .opCost(0).examCost(0).dnaCost(0).prpCost(0).etcCost(0)
                        .presbyopiaCost(0).hospitalSupplyCost(0)
                        .build()
        ));

        List<B2bRevenueMonthlyItem> read = martRepo.findMonthly(List.of(2026));
        // ORDER BY yr, mo
        assertThat(read).extracting(B2bRevenueMonthlyItem::getMonth).containsExactly(1, 2, 3);
        assertThat(read).extracting(B2bRevenueMonthlyItem::getTotalRevenue).containsExactly(3, 2, 1);
    }

    private static B2bRevenueMonthlyItem fullItem(int year, int month) {
        return B2bRevenueMonthlyItem.builder()
                .year(year).month(month)
                .totalRevenue(120_000_000).caseCount(40).avgRevenuePerCase(3_000_000)
                .visionRevenue(80_000_000).cataractRevenue(40_000_000)
                .visionCount(30).cataractCount(10)
                .designatedRevenue(70_000_000).nonDesignatedRevenue(50_000_000)
                .designatedCount(25).nonDesignatedCount(15)
                .opCost(90_000_000).examCost(10_000_000)
                .dnaCost(5_000_000).prpCost(4_000_000)
                .etcCost(3_000_000).presbyopiaCost(6_000_000)
                .hospitalSupplyCost(2_000_000)
                .build();
    }

    private static void execSilently(Connection conn, String sql) throws Exception {
        try (var st = conn.createStatement()) {
            st.execute(sql);
        }
    }
}
