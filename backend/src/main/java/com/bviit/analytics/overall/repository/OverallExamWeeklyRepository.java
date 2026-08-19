package com.bviit.analytics.overall.repository;

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
 * 검사자 종합표 주간 집계 쿼리 — 일자별로 집계한 뒤 서비스에서 주(월~일)로 버킷팅한다.
 *
 * 모든 쿼리는 EXAM_DATE(또는 OPERATION_DATE) 일자별 GROUP BY로 결과를 돌려준다.
 * 주 경계(월~일, 월 클립) 계산은 {@code OverallExamWeeklyService}에서 자바로 처리한다.
 * SQL 본문은 §1.3~1.10·§6의 검증된 월별 쿼리와 동일하며 집계 단위만 일자로 바꿨다.
 *
 * READ-ONLY — SELECT만 실행. 날짜 컬럼은 char(10) 'YYYY-MM-DD'.
 * MSSQL 2014 호환: STRING_AGG/TRIM 미사용 (LTRIM/RTRIM 사용).
 */
@Repository
@Profile("postgres-mart")
public class OverallExamWeeklyRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String FIND_DEMOGRAPHICS_DAILY_SQL = "sql/overall/find-demographics-daily.sql";
    private static final String FIND_VISION_DAILY_SQL = "sql/overall/find-vision-daily.sql";
    private static final String FIND_CATARACT_DAILY_SQL = "sql/overall/find-cataract-daily.sql";
    private static final String FIND_DREAMLENS_DAILY_SQL = "sql/overall/find-dreamlens-daily.sql";
    private static final String FIND_STOP_COUNT_DAILY_SQL = "sql/overall/find-stop-count-daily.sql";
    private static final String FIND_ONE_DAY_DAILY_SQL = "sql/overall/find-one-day-daily.sql";

    private final String findDemographicsDailySql;
    private final String findVisionDailySql;
    private final String findCataractDailySql;
    private final String findDreamlensDailySql;
    private final String findStopCountDailySql;
    private final String findOneDayDailySql;

    public OverallExamWeeklyRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.findDemographicsDailySql = SqlLoader.load(FIND_DEMOGRAPHICS_DAILY_SQL)
                .replace("__EXAM_SESSION_SOURCE__", SqlFragments.examSessionSource());
        this.findVisionDailySql = SqlLoader.load(FIND_VISION_DAILY_SQL);
        this.findCataractDailySql = SqlLoader.load(FIND_CATARACT_DAILY_SQL);
        this.findDreamlensDailySql = SqlLoader.load(FIND_DREAMLENS_DAILY_SQL);
        this.findStopCountDailySql = SqlLoader.load(FIND_STOP_COUNT_DAILY_SQL);
        this.findOneDayDailySql = SqlLoader.load(FIND_ONE_DAY_DAILY_SQL);
    }

    /**
     * 인구통계(검사수 모집단 = EXAM 행 + Cataract_Exam 세션) 일자별 집계.
     *   popTotal        = 총검사자(§1.9.1, raw COUNT)
     *   cataractSessions = 백내장 전체(노안포함, Cataract_Exam 세션수, idx9)
     *   직업(직장인/학생/기타)  §1.10 CUSTOM.JOB 롤업
     *   소개유형(일반/고객소개/직원소개) MOTIVE_NEW02.category01_name (Idx='1' 최신)
     * 고객소개 = '소개고객' + '소개미확인'(소개자정보 미입력). 레거시 월간보고가 소개미확인을
     * 고객소개로 편입한 것을 맞춰 정합(2026 prod 평균차 고객소개 ~13건·일반 ~10건, 지표정의 §6.3).
     */
    public List<Map<String, Object>> findDemographicsDaily(String from, String to) {
        String sql = findDemographicsDailySql;
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 시력교정 검사(§1.3, idx17) + 시력교정 수술예약(idx7) 일자별 집계.
     * examCount = 시력교정 검사건수, surgeryBooked = 그 중 수술예약(O, 취소 아님) 보유 고객.
     */
    public List<Map<String, Object>> findVisionDaily(String from, String to) {
        String sql = withExamMeasurementsBlank(findVisionDailySql);
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 백내장 만(추천 눈 수, §1.4, idx10) + 백내장 수술예약(idx12) 일자별 집계.
     */
    public List<Map<String, Object>> findCataractDaily(String from, String to) {
        String sql = findCataractDailySql;
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 드림렌즈 검사(§1.5, idx18) 일자별 집계 — 같은 날 렌즈센터(D) 예약만 있고 검사(M) 예약 없는 EXAM 행.
     */
    public List<Map<String, Object>> findDreamlensDaily(String from, String to) {
        String sql = withExamMeasurementsBlank(findDreamlensDailySql);
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 중단수(idx15) 일자별 집계 — EXAM.STOP_YN='Y'.
     */
    public List<Map<String, Object>> findStopCountDaily(String from, String to) {
        String sql = findStopCountDailySql;
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 원데이(idx28) + 원데이예약(idx29) 일자별 집계.
     *   oneDay       = EXAM 기준 같은 날 검사OP(M/5) 내원 + 중단/취소/테스트 제외 (§1.9.2)
     *   oneDayBooked = 그 중 검사일~+7일 사이 유효 시력교정 수술(OPERATIONDATA, 백내장 제외) 존재
     */
    public List<Map<String, Object>> findOneDayDaily(String from, String to) {
        String sql = findOneDayDailySql;
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
