package com.bviit.analytics.accounting.service;

import com.bviit.analytics.accounting.dto.MedicalMonthlyItem;
import com.bviit.analytics.accounting.dto.MedicalMonthlyPoint;
import com.bviit.analytics.accounting.repository.AccountingMartRepository;
import com.bviit.analytics.accounting.repository.MedicalReceiptSourceRepository;
import com.bviit.analytics.accounting.repository.VisionReceiptSourceRepository;
import com.bviit.analytics.batch.dto.BatchRunLog;
import com.bviit.analytics.batch.job.AccountingMartWriter;
import com.bviit.analytics.batch.job.AccountingMartJob;
import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import com.bviit.analytics.batch.repository.BatchRunLogRepository;
import com.bviit.analytics.common.util.SqlLoader;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.doAnswer;

@EnabledIfEnvironmentVariable(named = "RUN_INTEGRATION_TESTS", matches = "true")
@Testcontainers
class AccountingMartIntegrityIT {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18-alpine");
    private static HikariDataSource dataSource;
    private static final LocalDate FROM = LocalDate.of(2026, 7, 1);
    private static final LocalDate TO = LocalDate.of(2026, 7, 31);
    private NamedParameterJdbcTemplate jdbc;
    private AccountingMartWriter writer;
    private AccountingMartQueryService reader;
    private MedicalReceiptSourceRepository source;
    private MedicalReceiptImportService importer;

    @BeforeEach
    void setUp() throws Exception {
        if (dataSource == null) {
            dataSource = new HikariDataSource();
            dataSource.setJdbcUrl(POSTGRES.getJdbcUrl());
            dataSource.setUsername(POSTGRES.getUsername());
            dataSource.setPassword(POSTGRES.getPassword());
        }
        jdbc = new NamedParameterJdbcTemplate(dataSource);
        try (Connection connection = dataSource.getConnection()) {
            for (String script : List.of("accounting/tables/V67a__list_medical_receipt.sql",
                    "accounting/tables/V67b__mart_medical_receipt_monthly.sql",
                    "accounting/tables/V67c__list_vision_receipt.sql",
                    "accounting/tables/V68__medical_receipt_month_coverage.sql",
                    "batch/tables/V1a__batch_run_log.sql", "batch/tables/V1b__batch_watermark.sql")) {
                ScriptUtils.executeSqlScript(connection, new ClassPathResource("sql/mart/" + script));
            }
        }
        jdbc.getJdbcTemplate().execute("TRUNCATE list_medical_receipt, list_vision_receipt, "
                + "mart_medical_receipt_monthly, batch_run_log, batch_watermark RESTART IDENTITY");
        writer = transactional(new AccountingMartWriter(jdbc));
        reader = transactional(new AccountingMartQueryService(new AccountingMartRepository(jdbc)));
        source = mock(MedicalReceiptSourceRepository.class);
        importer = transactional(new MedicalReceiptImportService(source, writer));
    }

    @AfterAll
    static void close() {
        if (dataSource != null) dataSource.close();
    }

    @SuppressWarnings("unchecked")
    private <T> T transactional(T target) {
        ProxyFactory factory = new ProxyFactory(target);
        factory.setProxyTargetClass(true);
        TransactionInterceptor interceptor = new TransactionInterceptor();
        interceptor.setTransactionManager(new DataSourceTransactionManager(dataSource));
        interceptor.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        factory.addAdvice(interceptor);
        return (T) factory.getProxy();
    }

    @Test
    void 일부_월과_일부_날짜만_적재돼도_전체_월_금액을_누락하지_않는다() {
        writer.upsertMedicalMonthly(List.of(month(2026, 6, 600), month(2026, 7, 700)), false);
        writer.replaceMedicalReceipts(FROM, TO, List.of(row("2026-07-15", 10)));
        assertThat(reader.getMedicalMonthly(List.of(2026), "전체"))
                .extracting(MedicalMonthlyPoint::net).containsExactly(600L, 700L);

        when(source.findReceipts(FROM, TO)).thenReturn(List.of(row("2026-07-01", 100), row("2026-07-15", 200)));
        when(source.findMonthlyParts(FROM, TO)).thenReturn(List.of(part("2026-07", 2, 700)));
        importer.importRange(LocalDate.of(2026, 7, 15), LocalDate.of(2026, 7, 15));

        verify(source).findReceipts(FROM, TO);
        assertThat(reader.getMedicalMonthly(List.of(2026), "전체"))
                .extracting(MedicalMonthlyPoint::net).containsExactly(600L, 300L);
        assertThat(reader.getMedicalMonthly(List.of(2026), "외래"))
                .extracting(MedicalMonthlyPoint::net).containsExactly(300L);
        assertThat(reader.getMedicalMonthly(List.of(2026), "입원"))
                .extracting(MedicalMonthlyPoint::net).containsExactly(0L);
    }

    @Test
    void 원천에서_월_전체가_삭제되면_행과_월집계_모두_0이_된다() {
        writer.upsertMedicalMonthly(List.of(month(2026, 7, 700)), true);
        writer.replaceMedicalReceipts(FROM, TO, List.of(row("2026-07-15", 700)));
        importer.importRange(FROM, TO); // 원천 mock 기본값 = 빈 목록
        assertThat(reader.getMedicalReceipts(FROM.toString(), TO.toString())).isEmpty();
        assertThat(reader.getMedicalMonthly(List.of(2026), "전체"))
                .extracting(MedicalMonthlyPoint::net).containsExactly(0L);
        assertThat(jdbc.getJdbcTemplate().queryForObject(
                "SELECT net FROM mart_medical_receipt_monthly WHERE yr=2026 AND mo=7", Long.class)).isZero();
    }

    @Test
    void 행이_없는_과거연도도_삭제된_월집계는_0으로_갱신한다() {
        writer.upsertMedicalMonthly(List.of(month(2025, 12, 500)), false);
        importer.importRange(LocalDate.of(2025, 12, 15), LocalDate.of(2026, 1, 15));
        assertThat(reader.getMedicalMonthly(List.of(2025, 2026), "전체"))
                .extracting(MedicalMonthlyPoint::net).containsExactly(0L, 0L);
        assertThat(jdbc.getJdbcTemplate().queryForList(
                "SELECT rows_complete FROM mart_medical_receipt_monthly ORDER BY yr, mo", Boolean.class))
                .containsExactly(false, true);
    }

    @Test
    void 행_삽입_실패시_기존_행과_월집계가_함께_보존된다() {
        writer.upsertMedicalMonthly(List.of(month(2026, 7, 700)), false);
        writer.replaceMedicalReceipts(FROM, TO, List.of(row("2026-07-15", 700)));
        when(source.findReceipts(FROM, TO)).thenReturn(List.of(row("invalid-date", 100)));
        when(source.findMonthlyParts(FROM, TO)).thenReturn(List.of(part("2026-07", 1, 100)));
        assertThatThrownBy(() -> importer.importRange(FROM, TO)).isInstanceOf(RuntimeException.class);
        assertThat(reader.getMedicalReceipts(FROM.toString(), TO.toString())).hasSize(1);
        assertThat(reader.getMedicalMonthly(List.of(2026), "전체"))
                .extracting(MedicalMonthlyPoint::net).containsExactly(700L);
    }

    @Test
    void 조회_도중_월전체_적재가_완료돼도_그_월이_누락되지_않는다() {
        writer.upsertMedicalMonthly(List.of(month(2026, 7, 700)), false);
        AccountingMartRepository repository = spy(new AccountingMartRepository(jdbc));
        doAnswer(invocation -> {
            Object rows = invocation.callRealMethod();
            CompletableFuture.runAsync(() -> writer.upsertMedicalMonthly(List.of(month(2026, 7, 0)), true)).join();
            return rows;
        }).when(repository).findMedicalMonthlyFromList(List.of(2026), "", false);
        AccountingMartQueryService concurrentReader = transactional(new AccountingMartQueryService(repository));
        assertThat(concurrentReader.getMedicalMonthly(List.of(2026), "전체"))
                .extracting(MedicalMonthlyPoint::net).containsExactly(700L);
    }

    @Test
    void 진료_트랜잭션이_롤백돼도_시력교정은_실제_DB에_커밋된다() {
        VisionReceiptSourceRepository vision = mock(VisionReceiptSourceRepository.class);
        when(vision.findPayments(FROM, TO)).thenReturn(List.of(Map.of(
                "custNum", "TEST", "seq", 1, "subSeq", 1, "receiptDate", "2026-07-15", "amount", 100)));
        when(source.findReceipts(FROM, TO)).thenReturn(List.of(row("invalid-date", 100)));
        AccountingMartJob job = transactional(new AccountingMartJob(vision, writer, importer,
                new BatchSuccessLogRepository(jdbc)));
        assertThat(job.run(FROM, TO)).containsEntry("list_medical_receipt_failed", 1);
        assertThat(reader.getVisionReceipts(FROM.toString(), TO.toString())).hasSize(1);
        assertThat(jdbc.getJdbcTemplate().queryForObject("SELECT COUNT(*) FROM batch_watermark", Integer.class)).isZero();
        assertThat(reader.getMedicalMonthly(List.of(2026), "전체")).isEmpty();
    }

    @Test
    void 마트_상태의_월집계_연도는_행_존재와_독립적으로_null을_판정한다() {
        writer.upsertMedicalMonthly(List.of(month(2025, 1, 100)), false);
        assertThat(reader.getStatus().medicalMonthlyFromYear()).isEqualTo(2025);
        jdbc.getJdbcTemplate().execute("DELETE FROM mart_medical_receipt_monthly");
        writer.replaceMedicalReceipts(FROM, TO, List.of(row("2026-07-15", 100)));
        assertThat(reader.getStatus().medicalMonthlyFromYear()).isNull();
    }

    @Test
    void 부분_실패_로그는_성공한_행수와_실패_표시를_보존한다() {
        BatchRunLogRepository logs = new BatchRunLogRepository(jdbc, new ObjectMapper());
        long id = logs.start("accounting", BatchRunLog.RunType.DAILY, FROM, TO);
        Map<String, Integer> stats = Map.of("list_vision_receipt", 3, "list_medical_receipt_failed", 1);
        logs.fail(id, "진료 수납 적재 실패", stats);
        BatchRunLog result = logs.findRecent(1).get(0);
        assertThat(result.status()).isEqualTo(BatchRunLog.Status.FAILED);
        assertThat(result.tableStats()).isEqualTo(stats);
        assertThat(logs.findLastSuccessfulDaily()).isEmpty();
    }

    @Test
    void 기존_월집계의_마이그레이션은_데이터를_보존하고_반복_가능하다() {
        writer.upsertMedicalMonthly(List.of(month(2026, 7, 700)), false);
        jdbc.getJdbcTemplate().execute("ALTER TABLE mart_medical_receipt_monthly DROP COLUMN rows_complete");
        String migration = SqlLoader.load("sql/mart/accounting/tables/V68__medical_receipt_month_coverage.sql");
        jdbc.getJdbcTemplate().execute(migration);
        jdbc.getJdbcTemplate().execute(migration);
        assertThat(reader.getMedicalMonthly(List.of(2026), "전체"))
                .extracting(MedicalMonthlyPoint::net).containsExactly(700L);
    }

    private static MedicalMonthlyItem month(int year, int month, long net) {
        return new MedicalMonthlyItem(year, month, 1, net, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    private static Map<String, Object> row(String date, long amount) {
        return Map.of("receiptDate", date, "receiptType", "외래", "chartNo", "TEST", "serialNo", 1,
                "actualPaid", amount, "status", 1, "revenueType", "기타외래");
    }

    private static Map<String, Object> part(String ym, int count, long amount) {
        return Map.of("src", "out", "ym", ym, "cnt", count, "v1", amount);
    }
}
