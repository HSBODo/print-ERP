package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 예약통계_백내장 — Postgres 마트 read.
 *
 * mart_reservation_stats_cataract_daily 원본에 reservation_stats_override 의 최신 보정값을
 * COALESCE 로 얹어 응답한다.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class CataractStatsSystemMartRepository {

    private static final String SELECT_SQL =
            SqlLoader.load("sql/mart/select-reservation-stats-cataract-daily.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<CataractStatsDailyRow> findDailyCounts(String from, String to) {
        return jdbc.query(SELECT_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, n) -> new CataractStatsDailyRow(
                        rs.getString("date"),
                        rs.getInt("total_cataract"), rs.getInt("total_presbyopia"),
                        rs.getInt("inbound_call"), rs.getInt("answered_call"),
                        rs.getInt("new_exam_inquiry"), rs.getInt("new_re_inquiry"), rs.getInt("new_patient"),
                        rs.getInt("tm_total_db"), rs.getInt("tm_valid_db"), rs.getInt("tm_reservation"),
                        rs.getInt("kakao_total_inquiry"),
                        rs.getInt("kakao_cataract_reservation"),
                        rs.getInt("kakao_presbyopia_reservation"),
                        rs.getInt("online_reservation"), rs.getInt("online_no_show"),
                        rs.getInt("cancel_online"), rs.getInt("cancel_crm"), rs.getInt("cancel_kakao"),
                        rs.getInt("visit"), rs.getInt("no_show_reservation"), rs.getInt("cancel")));
    }
}
