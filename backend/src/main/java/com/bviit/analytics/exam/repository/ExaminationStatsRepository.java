package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.common.util.SqlFragments;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 검사 건수 통계 쿼리 — 시력교정 + 드림렌즈 + 백내장 (docs/db/지표정의.md §1).
 *
 * 카테고리별 기준:
 *   시력교정 = EXAM 검사자 리스트 행 (사람) — 드림렌즈 분류 배제
 *   드림렌즈 = EXAM 검사자 리스트 행 (사람) — 같은 날 렌즈센터(D) 예약만 있는 행
 *   백내장 = Cataract_Exam 추천 수술방법 입력 눈 수 — 같은 날 백내장 검사(H) 내원 행만
 *
 * 시력교정 + 드림렌즈 = 검사자 리스트 월별 건수와 일치해야 한다.
 *
 * MSSQL 2014 호환: STRING_AGG, TRIM 등 사용 금지 (LTRIM/RTRIM 사용).
 * READ-ONLY — SELECT만 실행. 날짜 컬럼은 char(10) 'YYYY-MM-DD'.
 */
@Repository
@Profile({"mssql", "postgres-mart"})
public class ExaminationStatsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String FIND_VISION_CORRECTION_MONTHLY_SQL = "sql/exam/find-vision-correction-monthly.sql";
    private static final String FIND_DREAMLENS_MONTHLY_SQL = "sql/exam/find-dreamlens-monthly.sql";
    private static final String FIND_CATARACT_MONTHLY_SQL = "sql/exam/find-cataract-monthly.sql";
    private static final String FIND_CATARACT_RESERVATION_RATE_MONTHLY_SQL = "sql/exam/find-cataract-reservation-rate-monthly.sql";
    private static final String FIND_VISION_RESERVATION_RATE_MONTHLY_SQL = "sql/exam/find-vision-reservation-rate-monthly.sql";

    private final String findVisionCorrectionMonthlySql;
    private final String findDreamlensMonthlySql;
    private final String findCataractMonthlySql;
    private final String findCataractReservationRateMonthlySql;
    private final String findVisionReservationRateMonthlySql;

    public ExaminationStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.findVisionCorrectionMonthlySql = SqlLoader.load(FIND_VISION_CORRECTION_MONTHLY_SQL);
        this.findDreamlensMonthlySql = SqlLoader.load(FIND_DREAMLENS_MONTHLY_SQL);
        this.findCataractMonthlySql = SqlLoader.load(FIND_CATARACT_MONTHLY_SQL);
        this.findCataractReservationRateMonthlySql = SqlLoader.load(FIND_CATARACT_RESERVATION_RATE_MONTHLY_SQL);
        this.findVisionReservationRateMonthlySql = SqlLoader.load(FIND_VISION_RESERVATION_RATE_MONTHLY_SQL);
    }

    /**
     * 시력교정 검사 — EXAM(검사결과) 기준, 사람 단위.
     * 병원 "검사자 리스트" 행수 기준 → 측정값(RIGHT01/LEFT01) 필터 없음(미입력 검사도 포함).
     * EXAM에는 검사종류 구분 컬럼이 없어 드림렌즈가 월 ~2% 섞임 →
     * 같은 날 렌즈센터(D) 예약만 있고 검사(M) 예약이 없는 건을 배제.
     * 엄격 "실시"분만 필요하면 RIGHT01/LEFT01 존재 조건 추가.
     */
    public List<Map<String, Object>> findVisionCorrectionMonthly(String from, String to) {
        String sql = withExamMeasurementsBlank(findVisionCorrectionMonthlySql);
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 드림렌즈 검사 — 검사자 리스트와 같은 EXAM 기준, 사람 단위.
     * 같은 검사일에 렌즈센터(D) 예약이 있고 시력교정(M) 예약이 없는 EXAM 행만 집계한다.
     */
    public List<Map<String, Object>> findDreamlensMonthly(String from, String to) {
        String sql = withExamMeasurementsBlank(findDreamlensMonthlySql);
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 백내장 검사 — Cataract_Exam 기준 <b>눈(안)</b> 단위. 수술방법(OPERATIONR/L) 입력된 눈만 좌+우 합산.
     *
     * <p><b>월간보고 골든이 눈 기준이라 그에 맞춘다.</b> 2026-06-23 {@code afa6149} 가 레거시 BCRM
     * '백내장_검사' 화면에 맞추며 눈 → 사람(RESERVATION)으로 바꿨으나 서로 다른 원장을 맞춘 셈이었다
     * (6월 오차 +20). 2026-07-15 눈으로 복원 — java_dashboard {@code cabe8fc} 와 동일 정의.
     *
     * <p>2024·2025 는 {@code ExaminationStatsService.LEGACY_CATARACT} 확정값으로 덮어쓰므로
     * 이 쿼리는 2026+ 라이브에만 영향을 준다.
     *
     * <p>⚠️ <b>전체 검사자 리스트(AllExamListRepository)는 사람 기준이라 단위가 어긋난다 — 의도된 미해결이다.</b>
     * 레포트는 월간보고 재현, 리스트는 개별 환자 확인이라 목적이 다르다.
     * <p>⚠️ 되돌려도 골든과 완전히 맞지는 않는다(3월 −10 · 5월 −17). 상세·판단 근거:
     * {@code docs/db/백내장-검사수-정의-정정.md}
     */
    public List<Map<String, Object>> findCataractMonthly(String from, String to) {
        String sql = findCataractMonthlySql;
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 백내장 예약률 — 백내장 진단 눈 수(좌+우 합산) 대비 수술예약 보유 사람 수.
     *
     * ⚠️ 분모 = 눈 수, 분자 = 수술예약 사람 수로 단위가 다르지만, **레거시 월간보고(백내장 예약률 ~60%대)
     * 와 일치시키기 위해 눈분모를 사용**한다. 분모를 사람(좌·우 합산 아님)으로 바꾸면 ~89%로 레거시와
     * ~30%p 괴리가 나, 팀 결정에 따라 눈분모(레거시 정의)로 환원함 — 2026 라이브 ≈ 57·57·60·60·64%.
     * 2024·2025 하드코딩값(CATARACT_RATE_LEGACY)도 눈분모 기준이라 3개년 비교가 정합한다.
     */
    public List<Map<String, Object>> findCataractReservationRateMonthly(String from, String to) {
        String sql = findCataractReservationRateMonthlySql;
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 시력교정 예약률 — 시력교정 검사건수(EXAM, 드림렌즈 제외) 안에서 수술예약이 있는 고객 수.
     *
     * 분모는 findVisionCorrectionMonthly와 동일한 기준을 사용한다.
     */
    public List<Map<String, Object>> findVisionReservationRateMonthly(String from, String to) {
        String sql = withExamMeasurementsBlank(findVisionReservationRateMonthlySql);
        return jdbc.queryForList(sql, params(from, to));
    }

    private MapSqlParameterSource params(String from, String to) {
        return new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to);
    }

    private String withExamMeasurementsBlank(String sql) {
        return sql.replace(
                "__EXAM_MEASUREMENTS_BLANK__",
                SqlFragments.examMeasurementsBlankPredicate("e")
        );
    }
}
