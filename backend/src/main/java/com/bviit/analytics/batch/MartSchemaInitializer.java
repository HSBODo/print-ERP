package com.bviit.analytics.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.InitializingBean;
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
 * <h3>파일 구조 (2026-08-26 도메인 자립 구조로 재편)</h3>
 * <pre>
 * sql/mart/
 *   └─ {domain}/     batch · consultation · etc · exam · outpatient · overall · report · reservation · surgery
 *       ├─ tables/   테이블 1개 = 파일 1개 (32 파일)
 *       ├─ views/    CREATE VIEW (surgery/V37 · reservation/V50 · exam/V56)
 *       ├─ functions/ CREATE FUNCTION (surgery/V47 · surgery_op_type · surgery_name_excluded)
 *       ├─ seeds/    시드·골든값·백필 INSERT/UPDATE
 *       └─ (DML: select · insert · upsert · delete · update)
 * </pre>
 *
 * <h3>두 단계 구성</h3>
 * <ul>
 *   <li><b>DDL</b> — 테이블·뷰·함수 정의. {@code CREATE TABLE IF NOT EXISTS} ·
 *                    {@code CREATE OR REPLACE VIEW}(V37) 또는 {@code DROP VIEW + CREATE VIEW}(V50·V56, 컬럼 이름/순서 변경 대비) ·
 *                    {@code CREATE OR REPLACE FUNCTION} 패턴으로 매 부팅 재실행 안전.</li>
 *   <li><b>SEED</b> — 시드값·골든값·백필. {@code INSERT ... ON CONFLICT DO NOTHING/UPDATE} 로 idempotent.
 *                     배치가 커버하지 못하는 시기의 데이터를 마트에 심는다.</li>
 * </ul>
 *
 * <h3>순서 규약</h3>
 * <ul>
 *   <li>DDL 실행 순서: <b>kind 우선</b>(tables → functions → views · 의존성 방향), kind 내부는 V-번호 오름차순.
 *       도메인 폴더 분산돼도 applyDdlScripts() 는 kind별로 그룹핑해서 호출한다.
 *       엄밀한 V-번호 오름차순은 아님 — 예: V53(table) → V47(function) → V37(view) 로 되돌아감</li>
 *   <li>동일 V-번호 그룹(V1a/V1b …)은 알파벳 접미사 순서 — 그룹 내 테이블 간 의존성 없음</li>
 *   <li>SEED 는 모든 DDL 이후 실행</li>
 *   <li>SEED 내부는 V-번호 오름차순 (V14→V16 백필 의존성 보존)</li>
 * </ul>
 *
 * <h3>이력</h3>
 * <ul>
 *   <li>2026-08-26 — DDL 폴더를 도메인 자립 구조로 재편: 최상위 tables/·views/·functions/·seeds/ 삭제,
 *                    각 도메인 하위에 배치({domain}/tables/·{domain}/views/·{domain}/functions/·{domain}/seeds/).
 *                    이로써 mart/{domain}/ (DML) 과 완전 대칭. views/functions 는 대표 도메인 배정
 *                    (V37→surgery · V50→reservation · V56→exam · V47→surgery).</li>
 *   <li>2026-08-26 — V43 분리: tables/V43a (reservation_channel_staff 테이블+시드) 만 남기고
 *                    원본 V43 의 v_reservation_channel 뷰 부분은 삭제 (V50 이 완전 재정의로 덮어써 dead code 였음 · V48 삭제와 동일 사유).</li>
 *   <li>2026-08-26 — 여러 테이블이 섞여 있던 V1·V2·V3·V4·V5·V11·V28·V51 을 테이블 단위로 분리 (V1a/V1b · V2a/V2b/V2c …).
 *                    V-번호 그룹 유지, 접미사로 파일 식별. tables/ 18 파일 → 32 파일</li>
 *   <li>2026-08-25 — V34·V48·V52 (뷰 재정의 중복) 삭제 → 현재 최종 뷰 정의는 V37·V50·V56 이 담고 있음</li>
 *   <li>2026-08-25 — V17·V23·V26·V29·V32·V33·V38·V39-V45·V49·V54 (ALTER TABLE) 삭제 → 원본 CREATE 파일에 컬럼 통합</li>
 *   <li>2026-08-25 — 파일 배치를 도메인 폴더 구조로 재편</li>
 * </ul>
 *
 * <h3>시드가 함께 있는 DDL 파일</h3>
 * <ul>
 *   <li>V43a (reservation_channel_staff) — 자사 해외팀 채널 매핑 2건. V50 뷰가 LEFT JOIN</li>
 *   <li>V51b (lens_cost) — op_type 5종 초기 행(단가 0). 화면 입력 UI 가 이 행들을 목록으로 사용</li>
 * </ul>
 *
 * <h3>주의</h3>
 * <ul>
 *   <li>⚠️ 신규 V-스크립트 추가 시 적절한 폴더에 배치 후 아래 두 메서드 중 성격에 맞는 곳에 applyScript 추가</li>
 * </ul>
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class MartSchemaInitializer implements InitializingBean {

    private final DataSource dataSource;

    @Override
    public void afterPropertiesSet() {
        applyDdlScripts();
        applySeedScripts();
    }

    /**
     * DDL 36개 파일 — 테이블 32 + 함수 1 + 뷰 3.
     * 실행 순서: kind 우선(tables → functions → views · 의존성 방향), kind 내부는 V-번호 오름차순.
     * 파일 위치는 {domain}/{tables|functions|views}/ 로 도메인 하위에 분산됨.
     * 테이블 1개 = 파일 1개 원칙. 동일 V-번호 그룹은 접미사(a/b/c/d)로 구분.
     */
    private void applyDdlScripts() {
        // tables/ — 테이블 1개 = 파일 1개
        applyScript("sql/mart/batch/tables/V1a__batch_run_log.sql");
        applyScript("sql/mart/batch/tables/V1b__batch_watermark.sql");
        applyScript("sql/mart/surgery/tables/V2a__mart_surgery_monthly.sql");
        applyScript("sql/mart/surgery/tables/V2b__mart_surgery_daily.sql");
        applyScript("sql/mart/surgery/tables/V2c__list_surgery.sql");
        applyScript("sql/mart/reservation/tables/V3a__mart_reservation_monthly.sql");
        applyScript("sql/mart/reservation/tables/V3b__list_reservation.sql");
        applyScript("sql/mart/exam/tables/V4a__mart_examination_monthly.sql");
        applyScript("sql/mart/exam/tables/V4b__mart_procedure_exam_monthly.sql");
        applyScript("sql/mart/exam/tables/V4c__list_exam.sql");
        applyScript("sql/mart/exam/tables/V4d__list_cataract_exam.sql");
        applyScript("sql/mart/consultation/tables/V5a__mart_consultation_rate_monthly.sql");
        applyScript("sql/mart/consultation/tables/V5b__mart_stop_reason_monthly.sql");
        applyScript("sql/mart/consultation/tables/V5c__mart_reservation_rate_monthly.sql");
        applyScript("sql/mart/outpatient/tables/V6__outpatient_mart.sql");
        applyScript("sql/mart/overall/tables/V7__overall_mart.sql");
        applyScript("sql/mart/etc/tables/V8__etc_mart.sql");
        applyScript("sql/mart/exam/tables/V10__overall_exam_monthly.sql");
        applyScript("sql/mart/reservation/tables/V11a__mart_reservation_stats_system_daily.sql");
        applyScript("sql/mart/reservation/tables/V11b__mart_reservation_stats_cataract_daily.sql");
        applyScript("sql/mart/reservation/tables/V11c__reservation_stats_period_lock.sql");
        applyScript("sql/mart/reservation/tables/V11d__reservation_stats_override.sql");
        applyScript("sql/mart/reservation/tables/V12__reservation_overall_monthly_mart.sql");
        applyScript("sql/mart/reservation/tables/V21__mart_list_reservation_homepage.sql");
        applyScript("sql/mart/outpatient/tables/V25__outpatient_list_mart.sql");
        applyScript("sql/mart/report/tables/V28a__mart_weekly_report.sql");
        applyScript("sql/mart/report/tables/V28b__mart_exam_count_by_class.sql");
        applyScript("sql/mart/surgery/tables/V36__list_reoperation.sql");
        applyScript("sql/mart/reservation/tables/V43a__reservation_channel_staff.sql");
        applyScript("sql/mart/etc/tables/V51a__ad_spend.sql");
        applyScript("sql/mart/etc/tables/V51b__lens_cost.sql");
        applyScript("sql/mart/reservation/tables/V53__list_reservation_all_mart.sql");

        // functions/ — 뷰에서 참조하므로 뷰 앞에 실행
        applyScript("sql/mart/surgery/functions/V47__surgery_op_type_fn.sql");

        // views/ — 최종 뷰 정의 (테이블·함수 준비 완료 후)
        applyScript("sql/mart/surgery/views/V37__v_all_surgery_list.sql");
        applyScript("sql/mart/reservation/views/V50__v_reservation_channel_payment.sql");
        applyScript("sql/mart/exam/views/V56__v_all_exam_list_surgery_columns.sql");
    }

    /**
     * SEED 16개 파일 — 시드·골든값·백필. 순서 규약은 클래스 docstring 참조.
     */
    private void applySeedScripts() {
        applyScript("sql/mart/exam/seeds/V9__legacy_seed.sql");
        applyScript("sql/mart/consultation/seeds/V13__reservation_rate_monthly_seed.sql");
        applyScript("sql/mart/overall/seeds/V14__overall_exam_monthly_seed.sql");
        applyScript("sql/mart/surgery/seeds/V15__surgery_monthly_seed.sql");
        applyScript("sql/mart/overall/seeds/V16__overall_exam_monthly_cataract_backfill.sql");
        applyScript("sql/mart/consultation/seeds/V18__consultation_rate_monthly_seed.sql");
        applyScript("sql/mart/reservation/seeds/V19__reservation_stats_system_2026_h1_seed.sql");
        applyScript("sql/mart/reservation/seeds/V20__reservation_stats_cataract_2026_h1_seed.sql");
        applyScript("sql/mart/exam/seeds/V22__examination_monthly_2026_cataract_golden.sql");
        applyScript("sql/mart/reservation/seeds/V24__reservation_overall_monthly_2026_h1_seed.sql");
        applyScript("sql/mart/report/seeds/V27__monthly_report_2026_01_05_golden.sql");
        applyScript("sql/mart/report/seeds/V30__weekly_report_dreamlens_golden.sql");
        applyScript("sql/mart/report/seeds/V31__weekly_report_dreamlens_2026_w31.sql");
        applyScript("sql/mart/surgery/seeds/V35__surgery_monthly_2026_01_05_golden.sql");
        applyScript("sql/mart/report/seeds/V55__weekly_report_2025_seed.sql");
        applyScript("sql/mart/report/seeds/V57__weekly_report_2026_h1_daily_distribution.sql");
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
