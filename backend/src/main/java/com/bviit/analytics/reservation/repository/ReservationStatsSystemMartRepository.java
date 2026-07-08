package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 예약통계_시력교정 — Postgres 마트 read.
 *
 * mart_reservation_stats_system_daily 원본에 reservation_stats_override 의 최신 보정값을
 * COALESCE 로 얹어 응답한다(override 없으면 원본 그대로). 배치가 채운 D-1 데이터가 유일한 진실.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationStatsSystemMartRepository {

    private static final String SELECT_SQL =
            SqlLoader.load("sql/mart/select-reservation-stats-system-daily.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<ReservationStatsDailyRow> findDailyCounts(String from, String to) {
        return jdbc.query(SELECT_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, n) -> new ReservationStatsDailyRow(
                        rs.getString("date"),
                        rs.getInt("inbound_call"), rs.getInt("answered_call"),
                        rs.getInt("new_inquiry"), rs.getInt("call_reservation"),
                        rs.getInt("tm_total_db"), rs.getInt("tm_valid_db"), rs.getInt("tm_reservation"),
                        rs.getInt("tm_recounsel"), rs.getInt("tm_recounsel_valid"), rs.getInt("tm_recounsel_reservation"),
                        rs.getInt("home_received"), rs.getInt("home_reservation"),
                        rs.getInt("naver_received"), rs.getInt("naver_rejected"),
                        rs.getInt("naver_valid"), rs.getInt("naver_reservation"),
                        rs.getInt("kakao_inquiry"), rs.getInt("kakao_reservation"),
                        rs.getInt("cancel_call_naver"), rs.getInt("cancel_home"), rs.getInt("cancel_kakao"),
                        rs.getInt("visit"), rs.getInt("no_show_reservation"), rs.getInt("cancel")));
    }
}
