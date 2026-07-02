package com.bviit.analytics.surgery.repository;

import com.bviit.analytics.common.util.SqlLoader;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 수술 통계 쿼리 (레거시 stats-weekly-report.js 준용).
 *
 * 핵심 원칙:
 *   1) 시력교정: OPERATIONDATA에서 CUST_NUM이 Cataract_Operationdata에 있으면 제외 (중복 방지)
 *   2) 시력교정은 환자 수 기준, 백내장은 눈(안) 기준(CUST_NUM+OPERATION_DATE+R/L)
 *   3) 테스트 고객 제외 (CUST_NAME LIKE '%TEST%' OR '%테스트%')
 *   4) 수술 코드 제외 (X, OP불가, 모든수술가능, op x, Strabismus, TEST-TEST)
 *
 * MSSQL 2014 호환: STRING_AGG, TRIM 등 사용 금지.
 * READ-ONLY — SELECT만 실행.
 */
@Repository
@Profile({"mssql", "postgres-mart"})
public class SurgeryStatsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String FIND_VISION_MONTHLY_BY_TYPE_SQL = "sql/surgery/find-vision-monthly-by-type.sql";
    private static final String FIND_CATARACT_MONTHLY_BY_TYPE_SQL = "sql/surgery/find-cataract-monthly-by-type.sql";
    private static final String FIND_REOPERATION_MONTHLY_SQL = "sql/surgery/find-reoperation-monthly.sql";
    private static final String FIND_VISION_DAILY_BY_TYPE_SQL = "sql/surgery/find-vision-daily-by-type.sql";
    private static final String FIND_CATARACT_DAILY_BY_TYPE_SQL = "sql/surgery/find-cataract-daily-by-type.sql";
    private static final String FIND_REOPERATION_DAILY_SQL = "sql/surgery/find-reoperation-daily.sql";

    private final String findVisionMonthlyByTypeSql;
    private final String findCataractMonthlyByTypeSql;
    private final String findReoperationMonthlySql;
    private final String findVisionDailyByTypeSql;
    private final String findCataractDailyByTypeSql;
    private final String findReoperationDailySql;

    public SurgeryStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.findVisionMonthlyByTypeSql = SqlLoader.load(FIND_VISION_MONTHLY_BY_TYPE_SQL);
        this.findCataractMonthlyByTypeSql = SqlLoader.load(FIND_CATARACT_MONTHLY_BY_TYPE_SQL);
        this.findReoperationMonthlySql = SqlLoader.load(FIND_REOPERATION_MONTHLY_SQL);
        this.findVisionDailyByTypeSql = SqlLoader.load(FIND_VISION_DAILY_BY_TYPE_SQL);
        this.findCataractDailyByTypeSql = SqlLoader.load(FIND_CATARACT_DAILY_BY_TYPE_SQL);
        this.findReoperationDailySql = SqlLoader.load(FIND_REOPERATION_DAILY_SQL);
    }

    /**
     * 시력교정 + 렌즈 수술 월별 환자 수 (OPERATIONDATA, 백내장 환자 제외).
     *
     * 분류 순서 (가장 구체적 패턴 먼저):
     *   smilePro → smile → viva → tIcl → icl → tKpl → kpl → lasik → lasek → other
     */
    public List<Map<String, Object>> findVisionMonthlyByType(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", minYear + "-01-01")
                .addValue("to", maxYear + "-12-31");

        String sql = findVisionMonthlyByTypeSql;
        return jdbc.queryForList(sql, params);
    }

    /**
     * 백내장 수술 월별 눈(안) 수 (Cataract_Operationdata).
     * 레거시 백내장 수술건수 기준과 동일하게 우/좌안을 각각 1건으로 센다.
     *
     * 분류 (레거시 월간보고 p.27 백내장 매핑, 2026 IOL 명칭 기준 역산):
     *   catEdof (프리미엄/EDOF·연속초점): EDOF, Vivity, (Tecnis)Eyhance, (Tecnis)PureSee, Isopure, Symfony
     *   catMono (단초점): K-flex (기본 단초점) + 그 외(구 CATARACT/CTR 단독)
     *   catMulti (다초점): Clareon, Panoptix, RESTOR, Lara, LISA, CTR(M)/multi, 3PodF, T-CTR,
     *                      T-CATARACT, Precizon, LAL, ELANA, Gemetric 등 (프리미엄 다초점 기본군)
     * 검증(2026 1~4월): 단초점 전월·다초점/프리미엄 1·4월 완전 일치, 2월 ±1, 3월 ±5(LAL+·ELANA 경계).
     * ⚠ 정확한 IOL 등급(다초점/프리미엄/단초점) 매핑은 수기 관리라 ±일부 — 팀장 검증 예정(Phase 2).
     */
    public List<Map<String, Object>> findCataractMonthlyByType(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", minYear + "-01-01")
                .addValue("to", maxYear + "-12-31");

        String sql = findCataractMonthlyByTypeSql;
        return jdbc.queryForList(sql, params);
    }

    /**
     * 시력교정 재수술 월별 건수 (RE_OPERATION, 레코드(건) 단위).
     *
     * RE_OPERATION 한 행(=한 번의 재수술 방문)을 1건으로 센다. AGAIN_R 또는 AGAIN_L 중
     * 하나라도 적격이면 그 행을 카운트(양안 재수술도 1건). 다음은 시력교정 재수술이 아니므로 제외:
     *   - Irrigation / repo* / *reposition* : 세척·정복술(재수술 아님)
     *   - Clareon / T-Clareon / Tecnis / LAL / ELANA : 백내장 IOL 명칭(렌즈 교체이나 시력교정 재수술 집계 대상 외)
     *
     * 포함되는 시력교정 재수술: 익스체인지(exch/encla/Bio…), 리무벌(remo…), 재교정(EN/ENHANCE/Re-en…) 등.
     * 레거시 월간보고 p.27 "재수술 합계"(레이저+렌즈)와 단위 동일, 2026 1~4월 ±1 일치
     * (레거시 32·33·19·19 / 본 쿼리 33·34·18·19).
     * ⚠ Phase 2 — 레이저/렌즈 세부 분류와 EN/enhancement 포함 여부는 팀장 검증 필요.
     *
     * REOP_DATE는 char 'YYYY-MM-DD' → 문자열 비교/추출로 연·월 도출 (MSSQL 2014 호환).
     * READ-ONLY — SELECT만 실행.
     */
    public List<Map<String, Object>> findReoperationMonthly(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", minYear + "-01-01")
                .addValue("to", maxYear + "-12-31");

        String sql = findReoperationMonthlySql;
        return jdbc.queryForList(sql, params);
    }

    /**
     * 시력교정 + 렌즈 수술 일별 환자 수 (월별과 분류 규칙 동일, 일자 단위 GROUP BY).
     * from/to는 'YYYY-MM-DD' 문자열. dt 컬럼은 'YYYY-MM-DD'.
     */
    public List<Map<String, Object>> findVisionDailyByType(String from, String to) {
        return jdbc.queryForList(findVisionDailyByTypeSql, dateRangeParams(from, to));
    }

    /** 백내장 수술 일별 눈(안) 수 (월별과 분류 규칙 동일, 일자 단위 GROUP BY). */
    public List<Map<String, Object>> findCataractDailyByType(String from, String to) {
        return jdbc.queryForList(findCataractDailyByTypeSql, dateRangeParams(from, to));
    }

    /** 시력교정 재수술 일별 건수 (월별과 분류 규칙 동일, 일자 단위 GROUP BY). */
    public List<Map<String, Object>> findReoperationDaily(String from, String to) {
        return jdbc.queryForList(findReoperationDailySql, dateRangeParams(from, to));
    }

    private MapSqlParameterSource dateRangeParams(String from, String to) {
        return new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to);
    }
}
