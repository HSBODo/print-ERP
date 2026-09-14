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
import java.util.Map;

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

    private static final String SELECT_CONSULTATION_RATE_SQL  = SqlLoader.load("sql/mart/consultation/select-consultation-rate-monthly.sql");
    private static final String SELECT_STOP_REASON_SQL        = SqlLoader.load("sql/mart/consultation/select-stop-reason-monthly.sql");
    private static final String SELECT_RESERVATION_RATE_SQL   = SqlLoader.load("sql/mart/consultation/select-reservation-rate-monthly.sql");
    private static final String SELECT_STOP_REASON_DAILY_AGG_SQL = SqlLoader.load("sql/mart/consultation/select-stop-reason-daily-agg.sql");
    private static final String SELECT_RESERVATION_RATE_VISION_CANDIDATES_SQL   = SqlLoader.load("sql/mart/consultation/select-reservation-rate-vision-candidates.sql");
    private static final String SELECT_RESERVATION_RATE_CATARACT_CANDIDATES_SQL = SqlLoader.load("sql/mart/consultation/select-reservation-rate-cataract-candidates.sql");
    private static final String SELECT_CONSULTATION_RATE_VISION_CANDIDATES_SQL  = SqlLoader.load("sql/mart/consultation/select-consultation-rate-vision-candidates.sql");
    private static final String SELECT_CONSULTATION_RATE_CATARACT_CANDIDATES_SQL = SqlLoader.load("sql/mart/consultation/select-consultation-rate-cataract-candidates.sql");

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

    /**
     * 중단 사유 일별 집계 — v_all_exam_list(= 전체 검사자 리스트) 하나에서 뽑는다.
     * 월별은 월로, 주차는 ISO 주차로 각자 접어 쓴다. 두 축이 같은 행에서 나오므로 어긋날 수 없다.
     *
     * ⚠️ 리스트(list_exam)가 적재된 뒤에 호출해야 한다. 배치에서는 ExamMartJob 이 리스트를 채운 이후 단계.
     */
    public List<Map<String, Object>> findStopReasonDailyAgg(String from, String to) {
        return jdbc.queryForList(
                SELECT_STOP_REASON_DAILY_AGG_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
        );
    }

    /**
     * 예약률·상담성공률의 하이브리드 계산을 위한 Postgres 후보군 조회.
     * 반환 컬럼은 각 SQL 헤더 참조. Java 에서 MSSQL 브릿지 결과와 결합해 rate 를 계산한다.
     */
    public List<Map<String, Object>> findReservationRateVisionCandidates(String from, String to) {
        return jdbc.queryForList(
                SELECT_RESERVATION_RATE_VISION_CANDIDATES_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
        );
    }

    public List<Map<String, Object>> findReservationRateCataractCandidates(String from, String to) {
        return jdbc.queryForList(
                SELECT_RESERVATION_RATE_CATARACT_CANDIDATES_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
        );
    }

    public List<Map<String, Object>> findConsultationRateVisionCandidates(String from, String to) {
        return jdbc.queryForList(
                SELECT_CONSULTATION_RATE_VISION_CANDIDATES_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
        );
    }

    public List<Map<String, Object>> findConsultationRateCataractCandidates(String from, String to) {
        return jdbc.queryForList(
                SELECT_CONSULTATION_RATE_CATARACT_CANDIDATES_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
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
