package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 예약 변경이력 마트(list_reservation_change) 조회 — 화면용. 등록일 범위.
 */
@Repository
@Profile("postgres-mart")
public class ReservationChangeMartRepository {

    private static final String SELECT_SQL = SqlLoader.load("sql/mart/reservation/select-list-reservation-change.sql");

    private final NamedParameterJdbcTemplate jdbc;

    public ReservationChangeMartRepository(@Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> findByRegisteredRange(String from, String to) {
        return jdbc.queryForList(SELECT_SQL, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
