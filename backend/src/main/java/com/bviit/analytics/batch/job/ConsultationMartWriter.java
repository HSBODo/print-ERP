package com.bviit.analytics.batch.job;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.consultation.dto.CataractReservationRateItem;
import com.bviit.analytics.consultation.dto.ConsultationRateItem;
import com.bviit.analytics.consultation.dto.StopReasonMonthlyItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 전환·성공률 도메인 마트 write 컴포넌트 — PR-8.
 *
 * 세 마트 모두 upsert (ON CONFLICT DO UPDATE):
 *   - mart_consultation_rate_monthly     : PK (yr, mo)
 *   - mart_stop_reason_monthly           : PK (yr, mo)
 *   - mart_reservation_rate_monthly      : PK (yr, mo, category) — vision/cataract 격리
 *
 * 저장값은 서비스가 계산한 결과(rate 반올림 포함)를 그대로 저장.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ConsultationMartWriter {

    private static final String UPSERT_CONSULTATION_RATE_SQL   = SqlLoader.load("sql/mart/consultation/upsert-consultation-rate-monthly.sql");
    private static final String UPSERT_STOP_REASON_SQL         = SqlLoader.load("sql/mart/consultation/upsert-stop-reason-monthly.sql");
    private static final String UPSERT_RESERVATION_RATE_SQL    = SqlLoader.load("sql/mart/consultation/upsert-reservation-rate-monthly.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    @Transactional
    public int upsertConsultationRateMonthly(List<ConsultationRateItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(ConsultationMartWriter::toConsultationParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_CONSULTATION_RATE_SQL, batch);
        int total = sum(updated);
        log.info("mart_consultation_rate_monthly upserted rows={}", total);
        return total;
    }

    @Transactional
    public int upsertStopReasonMonthly(List<StopReasonMonthlyItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(ConsultationMartWriter::toStopReasonParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_STOP_REASON_SQL, batch);
        int total = sum(updated);
        log.info("mart_stop_reason_monthly upserted rows={}", total);
        return total;
    }

    /**
     * category 값(vision/cataract)과 함께 저장. 두 카테고리 각각 별도 호출.
     */
    @Transactional
    public int upsertReservationRateMonthly(String category, List<CataractReservationRateItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(item -> toReservationRateParams(category, item))
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_RESERVATION_RATE_SQL, batch);
        int total = sum(updated);
        log.info("mart_reservation_rate_monthly category={} upserted rows={}", category, total);
        return total;
    }

    private static SqlParameterSource toConsultationParams(ConsultationRateItem m) {
        return new MapSqlParameterSource()
                .addValue("yr", m.getYear())
                .addValue("mo", m.getMonth())
                .addValue("visionExamCount", m.getVisionExamCount())
                .addValue("visionCounselCount", m.getVisionCounselCount())
                .addValue("visionSurgeryBooked", m.getVisionSurgeryBooked())
                .addValue("visionActualSurgery", m.getVisionActualSurgery())
                .addValue("visionSurgeryRate", m.getVisionSurgeryRate())
                .addValue("visionCounselRate", m.getVisionCounselRate())
                .addValue("visionCounselRateOneday", m.getVisionCounselRateOneday())
                .addValue("visionCounselRateGeneral", m.getVisionCounselRateGeneral())
                .addValue("visionGeneralBookRate", m.getVisionGeneralBookRate())
                .addValue("cataractExamCount", m.getCataractExamCount())
                .addValue("cataractSurgeryBooked", m.getCataractSurgeryBooked())
                .addValue("cataractStoppedCount", m.getCataractStoppedCount())
                .addValue("cataractSurgeryRate", m.getCataractSurgeryRate());
    }

    private static SqlParameterSource toStopReasonParams(StopReasonMonthlyItem m) {
        return new MapSqlParameterSource()
                .addValue("yr", m.getYear())
                .addValue("mo", m.getMonth())
                .addValue("recommendX", m.getRecommendX())
                .addValue("lensImpossible", m.getLensImpossible())
                .addValue("keratoconus", m.getKeratoconus())
                .addValue("avellino", m.getAvellino())
                .addValue("glaucoma", m.getGlaucoma())
                .addValue("visionChange", m.getVisionChange())
                .addValue("other", m.getOther())
                .addValue("total", m.getTotal());
    }

    private static SqlParameterSource toReservationRateParams(String category, CataractReservationRateItem m) {
        return new MapSqlParameterSource()
                .addValue("yr", m.getYear())
                .addValue("mo", m.getMonth())
                .addValue("category", category)
                .addValue("examCount", m.getExamCount())
                .addValue("surgeryBookedCount", m.getSurgeryBookedCount())
                .addValue("reservationRate", m.getReservationRate());
    }

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
