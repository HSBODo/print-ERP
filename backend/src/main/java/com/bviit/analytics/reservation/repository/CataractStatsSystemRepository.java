package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
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
 * 예약통계_백내장 — 일자별 원시 카운트 라이브 집계(백내장 = RESERVE_FLAG='H').
 *
 * 채널 소스·근거는 SQL 파일 헤더 참고 (docs/db/예약통계_백내장-데이터소스-분석.md).
 *
 * <p><b>소스 라우팅 (data-platform 프로파일 · 2026-09-30 Phase 2)</b>
 * <ul>
 *   <li>기본: CRM 직접연결 (statsJdbcTemplate) + EICN OPENQUERY(MySQL 링크드서버).</li>
 *   <li>data-platform 활성: 웨어하우스 (warehouseJdbcTemplate) + raw.raw_eicn_stat_user_inbound_bseye 직접 조회.</li>
 * </ul>
 *
 * 날짜 바인딩: MSSQL 은 OPENQUERY 내부(MySQL 리터럴) 바인딩 불가 → ISO 재검증 + `__OQ_FROM__/__OQ_TO__` 치환.
 * 웨어하우스는 :from/:to 바인딩 그대로 쓰므로 resolveOpenQuerySql 은 no-op(치환 대상 없음 · ISO 검증만 남음).
 *
 * READ-ONLY · MSSQL 2014 호환(WITH(NOLOCK), 네임드 파라미터 :from/:to).
 */
@Repository
@Profile("postgres-mart")
public class CataractStatsSystemRepository {

    static final String SQL_MSSQL                = "sql/softcrm/reservation/stats/select-cataract-daily-counts.sql";
    static final String SQL_WAREHOUSE            = "sql/warehouse/reservation/stats/select-cataract-daily-counts.sql";
    static final String DRILL_DOWN_SQL_MSSQL     = "sql/softcrm/reservation/stats/select-cataract-drill-down.sql";
    static final String DRILL_DOWN_SQL_WAREHOUSE = "sql/warehouse/reservation/stats/select-cataract-drill-down.sql";
    private static final String ISO_DATE = "\\d{4}-\\d{2}-\\d{2}";

    private final NamedParameterJdbcTemplate jdbc;
    private final String sql;
    private final String drillDownSql;

    public CataractStatsSystemRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate statsJdbc,
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc,
            @Value("${data-platform.enabled:false}") boolean dataPlatformEnabled
    ) {
        this.jdbc = dataPlatformEnabled ? warehouseJdbc : statsJdbc;
        this.sql          = SqlLoader.load(dataPlatformEnabled ? SQL_WAREHOUSE            : SQL_MSSQL);
        this.drillDownSql = SqlLoader.load(dataPlatformEnabled ? DRILL_DOWN_SQL_WAREHOUSE : DRILL_DOWN_SQL_MSSQL);
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
        // OPENQUERY 리터럴 치환 전 ISO 형식 재검증(주입 방지). 컨트롤러가 LocalDate로 이미 검증하나 이중 가드.
        // 웨어하우스 SQL 에는 __OQ_ 치환 대상이 없어 replace 는 no-op 이 된다.
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
