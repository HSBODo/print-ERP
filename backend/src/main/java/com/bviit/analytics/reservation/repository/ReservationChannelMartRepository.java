package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.reservation.dto.ReservationChannelFunnelItem;
import com.bviit.analytics.reservation.dto.ReservationChannelOpTypeItem;
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
 * Legacy 짝 없음 — 신규 마트로 설계된 파생 뷰 전용 리포지토리다(Mart-Legacy 페어링 감사 시 참고).
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationChannelMartRepository {

    private static final String SELECT_FUNNEL_SQL =
            SqlLoader.load("sql/mart/select-reservation-channel-funnel.sql");
    private static final String SELECT_OPTYPE_SQL =
            SqlLoader.load("sql/mart/select-reservation-channel-optype.sql");

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
                        .notStop(rs.getInt("not_stop"))
                        .surgery(rs.getInt("surgery"))
                        .surgeryDone(rs.getInt("surgery_done"))
                        .reop(rs.getInt("reop"))
                        .surgeryAmount(rs.getLong("surgery_amount"))
                        .reservedPersons(rs.getInt("reserved_persons"))
                        .notCancelPersons(rs.getInt("not_cancel_persons"))
                        .visitedPersons(rs.getInt("visited_persons"))
                        .examinedPersons(rs.getInt("examined_persons"))
                        .notStopPersons(rs.getInt("not_stop_persons"))
                        .surgeryPersons(rs.getInt("surgery_persons"))
                        .surgeryDonePersons(rs.getInt("surgery_done_persons"))
                        .reopPersons(rs.getInt("reop_persons"))
                        .surgeryPaidPersons(rs.getInt("surgery_paid_persons"))
                        .totalReservedPersons(rs.getInt("total_reserved_persons"))
                        .totalNotCancelPersons(rs.getInt("total_not_cancel_persons"))
                        .totalVisitedPersons(rs.getInt("total_visited_persons"))
                        .totalExaminedPersons(rs.getInt("total_examined_persons"))
                        .totalNotStopPersons(rs.getInt("total_not_stop_persons"))
                        .totalSurgeryPersons(rs.getInt("total_surgery_persons"))
                        .totalSurgeryDonePersons(rs.getInt("total_surgery_done_persons"))
                        .totalReopPersons(rs.getInt("total_reop_persons"))
                        .totalSurgeryAmount(rs.getLong("total_surgery_amount"))
                        .totalSurgeryPaidPersons(rs.getInt("total_surgery_paid_persons"))
                        .build()
        );
    }

    /**
     * 채널 × 실제 수술 유형. channel 이 null 인 행은 전체 기준이다.
     * 수술등록이 있어도 아직 수술 전이면 유형이 없다 — 합계가 수술등록 인원보다 적은 게 정상.
     */
    public List<ReservationChannelOpTypeItem> findOpTypes(String from, String to) {
        return jdbc.query(
                SELECT_OPTYPE_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, i) -> ReservationChannelOpTypeItem.builder()
                        .channel(rs.getString("channel"))
                        .opType(rs.getString("op_type"))
                        .persons(rs.getInt("persons"))
                        .build()
        );
    }
}
