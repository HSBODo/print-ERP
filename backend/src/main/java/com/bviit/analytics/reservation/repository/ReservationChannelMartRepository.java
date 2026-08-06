package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.reservation.dto.ReservationChannelFunnelItem;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 예약 채널별 퍼널 조회 — v_reservation_channel(= 예약자 리스트 위의 파생 뷰)만 읽는다.
 *
 * MSSQL 을 타지 않으므로 터널이 끊겨도 동작한다.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationChannelMartRepository {

    private static final String SELECT_FUNNEL_SQL =
            SqlLoader.load("sql/mart/select-reservation-channel-funnel.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<ReservationChannelFunnelItem> findFunnel(String from, String to) {
        return jdbc.query(
                SELECT_FUNNEL_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, i) -> ReservationChannelFunnelItem.builder()
                        .channel(rs.getString("channel"))
                        .reserved(rs.getInt("reserved"))
                        .notCancel(rs.getInt("not_cancel"))
                        .visited(rs.getInt("visited"))
                        .examined(rs.getInt("examined"))
                        .surgery(rs.getInt("surgery"))
                        .reservedPersons(rs.getInt("reserved_persons"))
                        .notCancelPersons(rs.getInt("not_cancel_persons"))
                        .visitedPersons(rs.getInt("visited_persons"))
                        .examinedPersons(rs.getInt("examined_persons"))
                        .surgeryPersons(rs.getInt("surgery_persons"))
                        .totalReservedPersons(rs.getInt("total_reserved_persons"))
                        .totalNotCancelPersons(rs.getInt("total_not_cancel_persons"))
                        .totalVisitedPersons(rs.getInt("total_visited_persons"))
                        .totalExaminedPersons(rs.getInt("total_examined_persons"))
                        .totalSurgeryPersons(rs.getInt("total_surgery_persons"))
                        .build()
        );
    }
}
