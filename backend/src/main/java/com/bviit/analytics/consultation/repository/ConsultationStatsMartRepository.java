package com.bviit.analytics.consultation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.consultation.dto.CataractReservationRateItem;
import com.bviit.analytics.consultation.dto.ConsultationRateItem;
import com.bviit.analytics.consultation.dto.StopReasonMonthlyItem;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 전환·성공률 마트 read 전용 리포지토리.
 *
 * 대상 테이블:
 *   - mart_consultation_rate_monthly  — 시력교정/백내장 전환율
 *   - mart_stop_reason_monthly        — 검사 중단 사유
 *   - mart_reservation_rate_monthly   — 예약률 (category 파라미터로 vision/cataract 격리)
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ConsultationStatsMartRepository {

    private static final String SELECT_CONSULTATION_RATE_SQL  = SqlLoader.load("sql/mart/select-consultation-rate-monthly.sql");
    private static final String SELECT_STOP_REASON_SQL        = SqlLoader.load("sql/mart/select-stop-reason-monthly.sql");
    private static final String SELECT_RESERVATION_RATE_SQL   = SqlLoader.load("sql/mart/select-reservation-rate-monthly.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<ConsultationRateItem> findConsultationRateMonthly(List<Integer> years) {
        return jdbc.query(
                SELECT_CONSULTATION_RATE_SQL,
                new MapSqlParameterSource("years", years),
                (rs, i) -> ConsultationRateItem.builder()
                        .year(rs.getInt("yr"))
                        .month(rs.getInt("mo"))
                        .visionExamCount(rs.getInt("visionExamCount"))
                        .visionCounselCount(rs.getInt("visionCounselCount"))
                        .visionSurgeryBooked(rs.getInt("visionSurgeryBooked"))
                        .visionActualSurgery(rs.getInt("visionActualSurgery"))
                        .visionSurgeryRate(rs.getDouble("visionSurgeryRate"))
                        .visionCounselRate(rs.getDouble("visionCounselRate"))
                        .visionCounselRateOneday(rs.getDouble("visionCounselRateOneday"))
                        .visionCounselRateGeneral(rs.getDouble("visionCounselRateGeneral"))
                        .visionGeneralBookRate(rs.getDouble("visionGeneralBookRate"))
                        .cataractExamCount(rs.getInt("cataractExamCount"))
                        .cataractSurgeryBooked(rs.getInt("cataractSurgeryBooked"))
                        .cataractStoppedCount(rs.getInt("cataractStoppedCount"))
                        .cataractSurgeryRate(rs.getDouble("cataractSurgeryRate"))
                        .build()
        );
    }

    public List<StopReasonMonthlyItem> findStopReasonMonthly(List<Integer> years) {
        return jdbc.query(
                SELECT_STOP_REASON_SQL,
                new MapSqlParameterSource("years", years),
                (rs, i) -> StopReasonMonthlyItem.builder()
                        .year(rs.getInt("yr"))
                        .month(rs.getInt("mo"))
                        .recommendX(rs.getInt("recommendX"))
                        .lensImpossible(rs.getInt("lensImpossible"))
                        .keratoconus(rs.getInt("keratoconus"))
                        .avellino(rs.getInt("avellino"))
                        .glaucoma(rs.getInt("glaucoma"))
                        .visionChange(rs.getInt("visionChange"))
                        .other(rs.getInt("other"))
                        .total(rs.getInt("total"))
                        .build()
        );
    }

    public List<CataractReservationRateItem> findReservationRateMonthly(List<Integer> years, String category) {
        return jdbc.query(
                SELECT_RESERVATION_RATE_SQL,
                new MapSqlParameterSource()
                        .addValue("years", years)
                        .addValue("category", category),
                (rs, i) -> CataractReservationRateItem.builder()
                        .year(rs.getInt("yr"))
                        .month(rs.getInt("mo"))
                        .examCount(rs.getInt("examCount"))
                        .surgeryBookedCount(rs.getInt("surgeryBookedCount"))
                        .reservationRate(rs.getDouble("reservationRate"))
                        .build()
        );
    }
}
