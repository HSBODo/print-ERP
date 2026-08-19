package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlFragments;
import com.bviit.analytics.common.util.SqlLoader;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 시술별 검사 건수("검사수") 통계 쿼리.
 *
 * 검사수 = 검사자 리스트(all-exam-list)와 동일 모집단 — sql/fragments/exam-session-source.sql 공유.
 * 시력교정·드림렌즈는 EXAM 행(테스트고객·백내장스텁·순수외래 제외),
 * 백내장은 백내장검사 예약(H)+검안사 배정 기준이다.
 *
 * 2026-08-04 이전에는 두 테이블의 raw COUNT(*)를 단순 합산해 리스트와 어긋났다
 * (2026-07: 검사수 1,195 vs 리스트 1,158).
 *
 * READ-ONLY — SELECT만 실행. 날짜 컬럼은 char(10) 'YYYY-MM-DD'.
 * MSSQL 2014 호환: STRING_AGG/TRIM 미사용.
 */
@Repository
@Profile({"mssql", "postgres-mart"})
public class ProcedureExamStatsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String FIND_TOTAL_EXAM_COUNT_MONTHLY_SQL = "sql/exam/find-total-exam-count-monthly.sql";
    private static final String FIND_ONE_DAY_EXAM_COUNT_MONTHLY_SQL = "sql/exam/find-one-day-exam-count-monthly.sql";

    private final String findTotalExamCountMonthlySql;
    private final String findOneDayExamCountMonthlySql;

    public ProcedureExamStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.findTotalExamCountMonthlySql = SqlLoader.load(FIND_TOTAL_EXAM_COUNT_MONTHLY_SQL)
                .replace("__EXAM_SESSION_SOURCE__", SqlFragments.examSessionSource());
        this.findOneDayExamCountMonthlySql = SqlLoader.load(FIND_ONE_DAY_EXAM_COUNT_MONTHLY_SQL);
    }

    /**
     * 월별 검사수 = EXAM 행수 + Cataract_Exam 세션수 (raw COUNT).
     * 두 테이블을 월별로 각각 센 뒤 UNION ALL로 합산한다.
     */
    public List<Map<String, Object>> findTotalExamCountMonthly(String from, String to) {
        String sql = findTotalExamCountMonthlySql;
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 월별 원데이 검사 = EXAM 기준 같은 날 검사OP(M/5) 내원 건.
     *
     * 레거시 "원데이 검사" 차트 대조 결과 실제 당일 수술 여부가 아니라 검사OP 분류가 가장 가깝다.
     * 운영 기준:
     *   - EXAM.EXAM_DATE 기준
     *   - 같은 고객/같은 날짜 RESERVATION M/5 검사OP, RESERVE_STATE IN ('I','H') 존재
     *   - EXAM 중단/취소 제외
     *   - 테스트 고객/검사메모/예약번호 제외
     */
    public List<Map<String, Object>> findOneDayExamCountMonthly(String from, String to) {
        String sql = findOneDayExamCountMonthlySql;
        return jdbc.queryForList(sql, params(from, to));
    }

    private MapSqlParameterSource params(String from, String to) {
        return new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to);
    }
}
