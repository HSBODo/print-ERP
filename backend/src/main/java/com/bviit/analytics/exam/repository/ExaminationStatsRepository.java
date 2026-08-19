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
@Profile("postgres-mart")
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
     * 백내장 검사 — RESERVATION(백내장검사 예약) 기준 <b>사람</b> 단위.
     *
     * <p>레거시 원장은 <b>BCRM &gt; 통계(C) &gt; 통계_백내장_내원동기</b> 의 분류 '백내장' + '중단'.
     * 2026-07-23 원본 SQL 을 확보해 재현에 성공했다(6월 55/55 정확 일치).
     * 종전 {@code Cataract_Exam} 눈(안) 기준은 <b>다른 원장</b>이었다 — 5월 67 vs 골든 84 로 −17 이 났고,
     * 6월의 56 vs 55 는 단위가 우연히 근접한 것뿐이다.
     *
     * <p>집계: 기간 내 {@code RESERVE_FLAG='H'} 내원 고객 중 <b>검안사(MY_OPTOMETRIST)가 배정된 사람</b>.
     * 상담사가 {@code 'BS0808'}(BS미지정)이면 레거시 분류 '중단', 배정돼 있으면 '백내장' — 둘 다 포함한다.
     * 검안사가 없으면 'F/U'(외래 추적)라 빠진다.
     *
     * <p>⚠️ 레거시 원본의 {@code (SELECT EMP_NAME ...) = (SELECT EMP_NAME ...)} 패턴은 사실상 IS NOT NULL 검사다.
     * {@code MY_OPTOMETRIST IS NOT NULL} 로 옮기면 빈 문자열이 걸려 분류가 뒤집힌다(중단 65 / F/U 3).
     * 반드시 {@code EXISTS(EMPLOYEE)} 로 판정할 것.
     *
     * <p>⚠️ <b>과거월은 소급 변동한다</b> — 분류가 {@code CUSTOM} 의 <b>현재</b> 담당자 값을 참조하므로
     * 담당자 재배정 시 지난 달 숫자가 바뀐다. 그래서 <b>2026-01~05 는 골든 확정값을 seed 로 고정</b>하고
     * 이 쿼리는 <b>2026-06 부터</b> 적용한다. 2024·2025 는 종전대로 V9 seed 가 SSOT 이고
     * {@code ExamMartJob} 의 min-year 가드가 그 구간 write 를 막는다.
     *
     * <p>⚠️ 리스트({@code CataractExamListRepository}, {@code Cataract_Exam} 기준)와 모집단이 다르다 —
     * 6월 레포트 115명 대상 vs 리스트 114건, 겹치는 인원 109. 레포트=예약 기준 / 리스트=검사기록 기준으로
     * 목적이 달라 의도된 차이다. "두 화면이 안 맞는다"는 보고는 버그가 아니다.
     *
     * <p>2026 실측(2026-07-23) vs 골든: 1월 95/96 · 2월 65/68 · 3월 75/76 · 4월 63/58 · 5월 80/84 · 6월 <b>55/55</b>
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
