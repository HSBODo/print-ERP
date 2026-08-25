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
 * 마트 스키마·시드를 애플리케이션 기동 시 실행한다.
 * Flyway/Liquibase 도입 전까지의 임시 수단.
 *
 * <h3>파일 구조 (2026-08-25 폴더 재편)</h3>
 * <pre>
 * sql/mart/
 *   ├─ tables/       도메인별 CREATE TABLE (batch·surgery·reservation·exam·consultation·outpatient·overall·report·etc)
 *   ├─ views/        CREATE VIEW (v_all_surgery_list · v_reservation_channel · v_all_exam_list)
 *   ├─ functions/    CREATE FUNCTION (surgery_op_type · surgery_name_excluded)
 *   └─ seeds/        시드·골든값·백필 INSERT/UPDATE
 * </pre>
 *
 * <h3>두 단계 구성</h3>
 * <ul>
 *   <li><b>DDL</b> — 테이블·뷰·함수 정의. {@code CREATE TABLE IF NOT EXISTS} · {@code DROP VIEW + CREATE VIEW}
 *                    · {@code CREATE OR REPLACE FUNCTION} 패턴으로 매 부팅 재실행 안전.</li>
 *   <li><b>SEED</b> — 시드값·골든값·백필. {@code INSERT ... ON CONFLICT DO NOTHING/UPDATE} 로 idempotent.
 *                     배치가 커버하지 못하는 시기의 데이터를 마트에 심는다.</li>
 * </ul>
 *
 * <h3>순서 규약</h3>
 * <ul>
 *   <li>DDL 내부는 V-번호 오름차순 = 의존성 순서 (테이블·컬럼·함수 → 뷰)</li>
 *   <li>SEED 는 모든 DDL 이후 실행</li>
 *   <li>SEED 내부는 V-번호 오름차순 (V14→V16 백필 의존성 보존)</li>
 * </ul>
 *
 * <h3>2026-08-25 이력</h3>
 * <ul>
 *   <li>V34·V48·V52 (뷰 재정의 중복) 삭제 → V56·V50 이 최종 정의 담고 있음</li>
 *   <li>V17·V23·V26·V29·V32·V33·V38·V39-V45·V49·V54 (ALTER TABLE) 삭제 → 원본 CREATE 파일에 컬럼 통합</li>
 *   <li>파일 배치를 도메인 폴더 구조로 재편 (V-번호·파일 내용 유지, 위치만 이동)</li>
 * </ul>
 *
 * <h3>주의</h3>
 * <ul>
 *   <li>⚠️ V43 은 reservation_channel_staff 테이블 CREATE + 시드가 유일하게 있어 실행 필수 (V50 뷰가 LEFT JOIN)</li>
 *   <li>⚠️ 신규 V-스크립트 추가 시 적절한 폴더에 배치 후 아래 두 메서드 중 성격에 맞는 곳에 applyScript 추가</li>
 * </ul>
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class MartSchemaInitializer implements org.springframework.beans.factory.InitializingBean {

    private final DataSource dataSource;

    @Override
    public void afterPropertiesSet() {
        applyDdlScripts();
        applySeedScripts();
    }

    /**
     * DDL 22개 파일 — 테이블·뷰·함수 정의.
     * V-번호 오름차순 = 의존성 순서. 폴더는 도메인·역할별로 그룹핑.
     */
    private void applyDdlScripts() {
        // tables/ — 도메인별 CREATE TABLE (일부 파일은 하나에 여러 테이블 · 도메인 응집도 유지)
        applyScript("sql/mart/tables/batch/V1__batch_meta.sql");
        applyScript("sql/mart/tables/surgery/V2__surgery_mart.sql");
        applyScript("sql/mart/tables/reservation/V3__reservation_mart.sql");
        applyScript("sql/mart/tables/exam/V4__exam_mart.sql");
        applyScript("sql/mart/tables/consultation/V5__consultation_mart.sql");
        applyScript("sql/mart/tables/outpatient/V6__outpatient_mart.sql");
        applyScript("sql/mart/tables/overall/V7__overall_mart.sql");
        applyScript("sql/mart/tables/etc/V8__etc_mart.sql");
        applyScript("sql/mart/tables/exam/V10__overall_exam_monthly.sql");
        applyScript("sql/mart/tables/reservation/V11__reservation_stats_daily_mart.sql");
        applyScript("sql/mart/tables/reservation/V12__reservation_overall_monthly_mart.sql");
        applyScript("sql/mart/tables/reservation/V21__mart_list_reservation_homepage.sql");
        applyScript("sql/mart/tables/outpatient/V25__outpatient_list_mart.sql");
        applyScript("sql/mart/tables/report/V28__report_mart.sql");
        applyScript("sql/mart/tables/surgery/V36__list_reoperation.sql");
        applyScript("sql/mart/tables/reservation/V43__v_reservation_channel.sql");
        applyScript("sql/mart/tables/etc/V51__channel_profit_inputs.sql");
        applyScript("sql/mart/tables/reservation/V53__list_reservation_all_mart.sql");

        // functions/ — 뷰에서 참조하므로 뷰 앞에 실행
        applyScript("sql/mart/functions/V47__surgery_op_type_fn.sql");

        // views/ — 최종 뷰 정의 (테이블·함수 준비 완료 후)
        applyScript("sql/mart/views/V37__v_all_surgery_list.sql");
        applyScript("sql/mart/views/V50__v_reservation_channel_payment.sql");
        applyScript("sql/mart/views/V56__v_all_exam_list_surgery_columns.sql");
    }

    /**
     * SEED 15개 파일 — 시드·골든값·백필.
     * 모든 DDL 이후 실행. V-번호 오름차순 (V14→V16 백필 의존성 보존).
     */
    private void applySeedScripts() {
        applyScript("sql/mart/seeds/V9__legacy_seed.sql");
        applyScript("sql/mart/seeds/V13__reservation_rate_monthly_seed.sql");
        applyScript("sql/mart/seeds/V14__overall_exam_monthly_seed.sql");
        applyScript("sql/mart/seeds/V15__surgery_monthly_seed.sql");
        applyScript("sql/mart/seeds/V16__overall_exam_monthly_cataract_backfill.sql");
        applyScript("sql/mart/seeds/V18__consultation_rate_monthly_seed.sql");
        applyScript("sql/mart/seeds/V19__reservation_stats_system_2026_h1_seed.sql");
        applyScript("sql/mart/seeds/V20__reservation_stats_cataract_2026_h1_seed.sql");
        applyScript("sql/mart/seeds/V22__examination_monthly_2026_cataract_golden.sql");
        applyScript("sql/mart/seeds/V24__reservation_overall_monthly_2026_h1_seed.sql");
        applyScript("sql/mart/seeds/V27__monthly_report_2026_01_05_golden.sql");
        applyScript("sql/mart/seeds/V30__weekly_report_dreamlens_golden.sql");
        applyScript("sql/mart/seeds/V31__weekly_report_dreamlens_2026_w31.sql");
        applyScript("sql/mart/seeds/V35__surgery_monthly_2026_01_05_golden.sql");
        applyScript("sql/mart/seeds/V55__weekly_report_2025_seed.sql");
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
