package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 예약 종합(콜, 온라인) 마트 read 전용 리포지토리.
 *
 * 대상 테이블:
 *   - mart_reservation_overall_monthly — 월별 예약 종합/온라인/콜 (ReservationOverallMonthlyItem)
 *
 * 반환 shape 은 기존 MSSQL 직결 결과(ReservationOverallStatsService)와 동일.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationOverallMartRepository {

    private static final String SELECT_MONTHLY_SQL =
            SqlLoader.load("sql/mart/reservation/select-reservation-overall-monthly.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<ReservationOverallMonthlyItem> findMonthly(List<Integer> years) {
        return jdbc.query(
                SELECT_MONTHLY_SQL,
                new MapSqlParameterSource("years", years),
                (rs, i) -> ReservationOverallMonthlyItem.builder()
                        .year(rs.getInt("yr"))
                        .month(rs.getInt("mo"))
                        .reservations((Integer) rs.getObject("reservations"))
                        .online((Integer) rs.getObject("online"))
                        .call((Integer) rs.getObject("call"))
                        .total((Integer) rs.getObject("total"))
                        .build()
        );
    }
}
