package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 예약 마트 read 전용 리포지토리.
 *
 * 대상 테이블:
 *   - mart_reservation_monthly        : 월별 수술/외래/드림렌즈 (ReservationMonthlyItem)
 *   - list_reservation                : 예약자 명단 행 (reservation-list.sql 출력 shape)
 *
 * 반환 shape은 기존 MSSQL 직결 결과와 동일. 컷오버 후 컨트롤러/UI 영향 없음.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationStatsMartRepository {

    private static final String SELECT_MONTHLY_SQL              = SqlLoader.load("sql/mart/select-reservation-monthly.sql");
    private static final String SELECT_LIST_SQL                 = SqlLoader.load("sql/mart/select-list-reservation.sql");
    private static final String SELECT_RESERVATION_DAILY_AGG_SQL = SqlLoader.load("sql/mart/select-reservation-daily-agg.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<ReservationMonthlyItem> findMonthly(List<Integer> years) {
        return jdbc.query(
                SELECT_MONTHLY_SQL,
                new MapSqlParameterSource("years", years),
                (rs, i) -> ReservationMonthlyItem.builder()
                        .year(rs.getInt("yr"))
                        .month(rs.getInt("mo"))
                        .surgery(rs.getInt("surgery"))
                        .outpatient(rs.getInt("outpatient"))
                        .dreamlens(rs.getInt("dreamlens"))
                        .total(rs.getInt("total"))
                        .build()
        );
    }

    public List<Map<String, Object>> findList(String from, String to) {
        return jdbc.queryForList(
                SELECT_LIST_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
        );
    }

    /**
     * 예약 건수 일별 집계 — list_reservation_all 하나에서 뽑는다.
     * 월별은 월로, 주차는 ISO 주차로 각자 접어 쓴다. 두 축이 같은 행에서 나오므로 어긋날 수 없다.
     *
     * ⚠️ list_reservation_all 이 적재된 뒤에 호출해야 한다.
     */
    public List<Map<String, Object>> findReservationDailyAgg(String from, String to) {
        return jdbc.queryForList(
                SELECT_RESERVATION_DAILY_AGG_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
        );
    }
}
