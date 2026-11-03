package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownRow;
import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 예약통계_백내장 — 일자별 원시 카운트 라이브 집계(백내장 = RESERVE_FLAG='H').
 *
 * 채널 소스·근거는 SQL 파일 헤더 참고 (docs/db/예약통계_백내장-데이터소스-분석.md).
 *
 * READ-ONLY · 네임드 파라미터 :from/:to.
 */
@Repository
@Profile("postgres-mart")
public class CataractStatsSystemRepository {

    static final String SQL            = "sql/warehouse/reservation/stats/select-cataract-daily-counts.sql";
    static final String DRILL_DOWN_SQL = "sql/warehouse/reservation/stats/select-cataract-drill-down.sql";
    private static final String ISO_DATE = "\\d{4}-\\d{2}-\\d{2}";

    private final NamedParameterJdbcTemplate jdbc;
    private final String sql;
    private final String drillDownSql;

    public CataractStatsSystemRepository(
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc
    ) {
        this.jdbc = warehouseJdbc;
        this.sql          = SqlLoader.load(SQL);
        this.drillDownSql = SqlLoader.load(DRILL_DOWN_SQL);
    }

    public List<CataractStatsDailyRow> findDailyCounts(String from, String to) {
        String resolvedSql = resolveOpenQuerySql(sql, from, to);
        return jdbc.query(resolvedSql,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, n) -> new CataractStatsDailyRow(
                        rs.getString("d"),
                        rs.getInt("totalCataract"), rs.getInt("totalPresbyopia"),
                        rs.getInt("inboundCall"), rs.getInt("answeredCall"),
                        rs.getInt("newExamInquiry"), rs.getInt("newReInquiry"), rs.getInt("newPatient"),
                        rs.getInt("tmTotalDb"), rs.getInt("tmValidDb"), rs.getInt("tmReservation"),
                        rs.getInt("kakaoTotalInquiry"), rs.getInt("kakaoCataractReservation"), rs.getInt("kakaoPresbyopiaReservation"),
                        rs.getInt("onlineReservation"), rs.getInt("onlineNoShow"),
                        rs.getInt("cancelOnline"), rs.getInt("cancelCrm"), rs.getInt("cancelKakao"),
                        rs.getInt("visit"), rs.getInt("noShowReservation"), rs.getInt("cancel")));
    }

    static String resolveOpenQuerySql(String baseSql, String from, String to) {
        // ISO 형식 재검증(주입 방지). 컨트롤러가 LocalDate로 이미 검증하나 이중 가드.
        // 웨어하우스 SQL 에는 __OQ_ 치환 대상이 없어 replace 는 no-op 이 된다 (레거시 유지).
        if (from == null || to == null || !from.matches(ISO_DATE) || !to.matches(ISO_DATE)) {
            throw new IllegalArgumentException("from/to must be ISO yyyy-MM-dd dates");
        }
        return baseSql.replace("__OQ_FROM__", from).replace("__OQ_TO__", to);
    }

    public List<ReservationStatsDrillDownRow> findDrillDownRows(String date, String field) {
        return jdbc.query(drillDownSql,
                new MapSqlParameterSource().addValue("date", date).addValue("field", field),
                (rs, n) -> new ReservationStatsDrillDownRow(
                        rs.getString("d"),
                        rs.getString("field"),
                        rs.getString("source"),
                        rs.getString("gb"),
                        rs.getString("gb2"),
                        rs.getString("primaryKey"),
                        rs.getString("custNum"),
                        rs.getString("reserveNum"),
                        rs.getString("reserveState"),
                        rs.getString("exclusionReasonCandidate"),
                        rs.getInt("contribution")));
    }
}
