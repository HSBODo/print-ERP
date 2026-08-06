package com.bviit.analytics.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * 마트 메타 테이블(batch_run_log, batch_watermark) DDL을 애플리케이션 기동 시
 * IF NOT EXISTS로 실행한다. Flyway/Liquibase 도입 전까지의 임시 수단.
 *
 * 실제 마트 테이블(mart_*, list_*)은 각 도메인 PR에서 별도 V스크립트로 추가.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class MartSchemaInitializer implements org.springframework.beans.factory.InitializingBean {

    private final DataSource dataSource;

    @Override
    public void afterPropertiesSet() {
        applyScript("sql/mart/V1__batch_meta.sql");
        applyScript("sql/mart/V2__surgery_mart.sql");
        applyScript("sql/mart/V3__reservation_mart.sql");
        applyScript("sql/mart/V4__exam_mart.sql");
        applyScript("sql/mart/V5__consultation_mart.sql");
        applyScript("sql/mart/V6__outpatient_mart.sql");
        applyScript("sql/mart/V7__overall_mart.sql");
        applyScript("sql/mart/V8__etc_mart.sql");
        applyScript("sql/mart/V9__legacy_seed.sql");
        applyScript("sql/mart/V10__overall_exam_monthly.sql");
        applyScript("sql/mart/V11__reservation_stats_daily_mart.sql");
        applyScript("sql/mart/V12__reservation_overall_monthly_mart.sql");
        applyScript("sql/mart/V13__reservation_rate_monthly_seed.sql");
        applyScript("sql/mart/V14__overall_exam_monthly_seed.sql");
        applyScript("sql/mart/V15__surgery_monthly_seed.sql");
        applyScript("sql/mart/V16__overall_exam_monthly_cataract_backfill.sql");
        applyScript("sql/mart/V17__batch_run_log_table_stats.sql");
        applyScript("sql/mart/V18__consultation_rate_monthly_seed.sql");
        applyScript("sql/mart/V19__reservation_stats_system_2026_h1_seed.sql");
        applyScript("sql/mart/V20__reservation_stats_cataract_2026_h1_seed.sql");
        applyScript("sql/mart/V21__mart_list_reservation_homepage.sql");
        applyScript("sql/mart/V22__examination_monthly_2026_cataract_golden.sql");
        applyScript("sql/mart/V23__list_cataract_exam_classification.sql");
        applyScript("sql/mart/V24__reservation_overall_monthly_2026_h1_seed.sql");
        applyScript("sql/mart/V25__outpatient_list_mart.sql");
        applyScript("sql/mart/V26__list_exam_one_day.sql");
        applyScript("sql/mart/V27__monthly_report_2026_01_05_golden.sql");
        applyScript("sql/mart/V28__report_mart.sql");
        applyScript("sql/mart/V29__weekly_report_dreamlens_columns.sql");
        applyScript("sql/mart/V30__weekly_report_dreamlens_golden.sql");
        applyScript("sql/mart/V31__weekly_report_dreamlens_2026_w31.sql");
        applyScript("sql/mart/V32__list_cataract_exam_one_day.sql");
        applyScript("sql/mart/V33__surgery_presbyond_piol.sql");
        applyScript("sql/mart/V34__v_all_exam_list.sql");
        applyScript("sql/mart/V35__surgery_monthly_2026_01_05_golden.sql");
        applyScript("sql/mart/V36__list_reoperation.sql");
        applyScript("sql/mart/V37__v_all_surgery_list.sql");
        applyScript("sql/mart/V38__weekly_report_reoperation.sql");
        applyScript("sql/mart/V39__list_reservation_motive_m.sql");
        applyScript("sql/mart/V40__list_reservation_motive_source.sql");
        applyScript("sql/mart/V41__list_reservation_funnel.sql");
        applyScript("sql/mart/V42__list_reservation_motive_l.sql");
        applyScript("sql/mart/V44__list_reservation_contact.sql");
        applyScript("sql/mart/V43__v_reservation_channel.sql");
    }

    private void applyScript(String classpathLocation) {
        try (Connection conn = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(conn, new ClassPathResource(classpathLocation));
            log.info("Applied mart schema: {}", classpathLocation);
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to apply mart schema: " + classpathLocation, e);
        }
    }
}
