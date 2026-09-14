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
    private static final String DAILY_REGISTERED_SQL = SqlLoader.load("sql/mart/reservation/select-list-reservation-change-daily-registered.sql");
    private static final String DAILY_RESERVE_DATE_SQL = SqlLoader.load("sql/mart/reservation/select-list-reservation-change-daily-reserve-date.sql");

    private final NamedParameterJdbcTemplate jdbc;

    public ReservationChangeMartRepository(@Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> findByRegisteredRange(String from, String to) {
        return jdbc.queryForList(SELECT_SQL, range(from, to));
    }

    /** 추이 달력 · 등록일 기준 일별 집계(구분별). */
    public List<Map<String, Object>> findDailyByRegistered(String from, String to) {
        return jdbc.queryForList(DAILY_REGISTERED_SQL, range(from, to));
    }

    /** 추이 달력 · 예약일(최종) 기준 일별 집계(구분별). */
    public List<Map<String, Object>> findDailyByReserveDate(String from, String to) {
        return jdbc.queryForList(DAILY_RESERVE_DATE_SQL, range(from, to));
    }

    private static MapSqlParameterSource range(String from, String to) {
        return new MapSqlParameterSource().addValue("from", from).addValue("to", to);
    }
}
