package com.bviit.analytics.consultation.repository;

import com.bviit.analytics.common.util.SqlLoader;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 상담 전환율 쿼리 (레거시 BCRM 에브리데이 시스템 로직 기반).
 *
 * 시력교정 — softcrm/routes/consult-statistics.js 준용
 *   분모: EXAM 테이블 (CANCEL_CD 빈값)
 *   상담수: EXAM 중 STOP_YN<>'Y' AND (OPERATIONR OR OPERATIONL 비어있지 않음)
 *   수술예약: RESERVATION FLAG='O', STATE<>'C' 의 고객별 MIN(RESERVE_DATE)
 *   실제수술: OPERATIONDATA.OPERATION_DATE
 *
 * 백내장 — softcrm/routes/stats-c-cataract-visit-motive.js 준용
 *   분모: RESERVATION FLAG='H', JINRYO<>'3', STATE<>'C',
 *         NOT (JINRYO='1' AND SEQ='3'), CUST_NUM<>'9999999999999' — DISTINCT CUST_NUM
 *   수술예약: RESERVATION FLAG='O', JINRYO='4', STATE<>'C' 의 고객별 MIN(RESERVE_DATE)
 *   중단: CUSTOM.MY_optometrist 있음 AND CUSTOM.MY_COUNSELOR='BS0808'
 */
@Repository
@Profile({"mssql", "postgres-mart"})
public class ConsultationRateRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String FIND_MONTHLY_VISION_RATES_SQL = "sql/consultation/find-monthly-vision-rates.sql";
    private static final String FIND_MONTHLY_CATARACT_RATES_SQL = "sql/consultation/find-monthly-cataract-rates.sql";

    private final String findMonthlyVisionRatesSql;
    private final String findMonthlyCataractRatesSql;

    public ConsultationRateRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.findMonthlyVisionRatesSql = SqlLoader.load(FIND_MONTHLY_VISION_RATES_SQL);
        this.findMonthlyCataractRatesSql = SqlLoader.load(FIND_MONTHLY_CATARACT_RATES_SQL);
    }

    /**
     * 월별 시력교정 상담전환율 (EXAM 기반).
     *
     * 원데이(검사당일 검사OP M/5 예약 보유) / 일반(그 외)으로도 분해한다.
     *   - 상담성공률(검사중단/수술불가 제외): 전체/원데이/일반 = surgeryBooked / counsel (#21 3라인)
     *   - 일반 예약률(분모=검사): bookedGeneral / examGeneral (#19)
     */
    public List<Map<String, Object>> findMonthlyVisionRates(String fromDate, String toDate) {
        String sql = findMonthlyVisionRatesSql;
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", fromDate)
                .addValue("to", toDate));
    }

    /**
     * 월별 백내장 수술전환율 (CUSTOM + RESERVATION 기반).
     */
    public List<Map<String, Object>> findMonthlyCataractRates(String fromDate, String toDate) {
        String sql = findMonthlyCataractRatesSql;
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", fromDate)
                .addValue("to", toDate));
    }
}
