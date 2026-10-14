package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownRow;
import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 예약통계시스템 — BCRM RSS 컨택통계 일자별 원시 카운트(CH01~CH24).
 *
 * 운영 BCRM RSS 쿼리를 단일 SELECT(임시테이블 → CTE)로 재구성한 것. 7개 채널 소스를 PK+예약날짜로
 * LEFT JOIN해 일자별 카운트를 낸다. 검사 인입/응대콜은 EICN_MySQL 링크드서버를 OPENQUERY로 조회한다
 * (data-platform 활성 시 raw.raw_eicn_stat_user_inbound_bseye 직접 조회로 대체).
 *
 * <p><b>소스 라우팅 (data-platform 프로파일 · 2026-10-06 Phase 2)</b>
 * <ul>
 *   <li>기본: CRM 직접연결 (statsJdbcTemplate) + EICN OPENQUERY(MySQL 링크드서버).</li>
 *   <li>data-platform 활성: 웨어하우스 (warehouseJdbcTemplate) + raw.raw_eicn_stat_user_inbound_bseye 직접 조회.</li>
 * </ul>
 *
 * 날짜 바인딩:
 *   - MSSQL 측 술어는 모두 :from / :to / :date 네임드 파라미터.
 *   - OPENQUERY 내부(MySQL 문자열 리터럴)는 파라미터 바인딩이 불가하므로, 컨트롤러에서
 *     LocalDate로 검증된 ISO 날짜(yyyy-MM-dd)만 치환한다(아래 ISO 형식 재검증 후 replace).
 *   - 웨어하우스 SQL 에는 __OQ_ 치환 대상이 없어 replace 는 no-op 이 된다 (ISO 검증은 유지).
 *
 * READ-ONLY · MSSQL 2014 호환(TRIM 금지, WITH(NOLOCK)).
 */
@Repository
@Profile("postgres-mart")
public class ReservationStatsSystemRepository {

    static final String SQL_MSSQL                = "sql/softcrm/reservation/stats/select-system-daily-counts.sql";
    static final String SQL_WAREHOUSE            = "sql/warehouse/reservation/stats/select-system-daily-counts.sql";
    static final String DRILL_DOWN_SQL_MSSQL     = "sql/softcrm/reservation/stats/select-system-drill-down.sql";
    static final String DRILL_DOWN_SQL_WAREHOUSE = "sql/warehouse/reservation/stats/select-system-drill-down.sql";
    private static final String ISO_DATE = "\\d{4}-\\d{2}-\\d{2}";

    private final NamedParameterJdbcTemplate jdbc;
    private final String sql;
    private final String drillDownSql;

    public ReservationStatsSystemRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate statsJdbc,
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc,
            @Value("${data-platform.enabled:false}") boolean dataPlatformEnabled
    ) {
        this.jdbc = dataPlatformEnabled ? warehouseJdbc : statsJdbc;
        this.sql          = SqlLoader.load(dataPlatformEnabled ? SQL_WAREHOUSE            : SQL_MSSQL);
        this.drillDownSql = SqlLoader.load(dataPlatformEnabled ? DRILL_DOWN_SQL_WAREHOUSE : DRILL_DOWN_SQL_MSSQL);
    }

    public List<ReservationStatsDailyRow> findDailyCounts(String from, String to) {
        String resolvedSql = resolveSystemSql(sql, from, to);

        return jdbc.query(resolvedSql,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, n) -> new ReservationStatsDailyRow(
                        rs.getString("d"),
                        rs.getInt("inboundCall"), rs.getInt("answeredCall"), rs.getInt("newInquiry"), rs.getInt("callReservation"),
                        rs.getInt("tmTotalDb"), rs.getInt("tmValidDb"), rs.getInt("tmReservation"),
                        rs.getInt("tmRecounsel"), rs.getInt("tmRecounselValid"), rs.getInt("tmRecounselReservation"),
                        rs.getInt("homeReceived"), rs.getInt("homeReservation"),
                        rs.getInt("naverReceived"), rs.getInt("naverRejected"), rs.getInt("naverValid"), rs.getInt("naverReservation"),
                        rs.getInt("kakaoInquiry"), rs.getInt("kakaoReservation"),
                        rs.getInt("cancelCallNaver"), rs.getInt("cancelHome"), rs.getInt("cancelKakao"),
                        rs.getInt("visit"), rs.getInt("noShowReservation"), rs.getInt("cancel")));
    }

    public List<ReservationStatsDrillDownRow> findDrillDownRows(String date, String field) {
        String resolvedSql = resolveSystemDrillDownSql(drillDownSql, date);

        return jdbc.query(resolvedSql,
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

    static String resolveSystemSql(String baseSql, String from, String to) {
        // OPENQUERY 리터럴 치환 전 ISO 형식 재검증(주입 방지). 컨트롤러가 LocalDate로 이미 검증하나 이중 가드.
        if (from == null || to == null || !from.matches(ISO_DATE) || !to.matches(ISO_DATE)) {
            throw new IllegalArgumentException("from/to must be ISO yyyy-MM-dd dates");
        }
        return baseSql.replace("__OQ_FROM__", from).replace("__OQ_TO__", to);
    }

    static String resolveSystemDrillDownSql(String baseSql, String date) {
        if (date == null || !date.matches(ISO_DATE)) {
            throw new IllegalArgumentException("date must be an ISO yyyy-MM-dd date");
        }
        return baseSql.replace("__OQ_DATE__", date);
    }
}
