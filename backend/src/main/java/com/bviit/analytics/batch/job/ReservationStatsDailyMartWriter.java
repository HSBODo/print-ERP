package com.bviit.analytics.batch.job;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 예약통계(시력교정·백내장) 일별 마트 write 컴포넌트.
 *
 * - upsert (ON CONFLICT DO UPDATE) 로 D-1 하루 또는 임의 범위의 일자 적재.
 * - 잠긴 월(reservation_stats_period_lock) 조회 helper 제공 — 잡이 필터링에 사용.
 * - 셀 수기 보정(reservation_stats_override) 는 이 writer 와 무관하게 별도 유지.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationStatsDailyMartWriter {

    private static final String UPSERT_SYSTEM_SQL =
            SqlLoader.load("sql/mart/reservation/upsert-reservation-stats-system-daily.sql");
    private static final String UPSERT_CATARACT_SQL =
            SqlLoader.load("sql/mart/reservation/upsert-reservation-stats-cataract-daily.sql");
    private static final String SELECT_LOCKED_PERIODS_SQL =
            SqlLoader.load("sql/mart/reservation/select-reservation-stats-locked-periods.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    /** product_type 의 잠긴 월(period) 집합. 배치 잡이 upsert 전 필터링에 사용. */
    public Set<String> findLockedPeriods(String productType) {
        List<String> periods = jdbc.queryForList(
                SELECT_LOCKED_PERIODS_SQL,
                new MapSqlParameterSource("productType", productType),
                String.class
        );
        return new HashSet<>(periods);
    }

    @Transactional
    public int upsertSystemDaily(List<ReservationStatsDailyRow> rows) {
        if (rows.isEmpty()) return 0;
        SqlParameterSource[] batch = rows.stream()
                .map(ReservationStatsDailyMartWriter::toSystemParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_SYSTEM_SQL, batch);
        int total = sum(updated);
        log.info("mart_reservation_stats_system_daily upserted rows={}", total);
        return total;
    }

    @Transactional
    public int upsertCataractDaily(List<CataractStatsDailyRow> rows) {
        if (rows.isEmpty()) return 0;
        SqlParameterSource[] batch = rows.stream()
                .map(ReservationStatsDailyMartWriter::toCataractParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_CATARACT_SQL, batch);
        int total = sum(updated);
        log.info("mart_reservation_stats_cataract_daily upserted rows={}", total);
        return total;
    }

    private static SqlParameterSource toSystemParams(ReservationStatsDailyRow r) {
        return new MapSqlParameterSource()
                .addValue("statDate", r.date())
                .addValue("period", periodOf(r.date()))
                .addValue("inboundCall", r.inboundCall())
                .addValue("answeredCall", r.answeredCall())
                .addValue("newInquiry", r.newInquiry())
                .addValue("callReservation", r.callReservation())
                .addValue("tmTotalDb", r.tmTotalDb())
                .addValue("tmValidDb", r.tmValidDb())
                .addValue("tmReservation", r.tmReservation())
                .addValue("tmRecounsel", r.tmRecounsel())
                .addValue("tmRecounselValid", r.tmRecounselValid())
                .addValue("tmRecounselReservation", r.tmRecounselReservation())
                .addValue("homeReceived", r.homeReceived())
                .addValue("homeReservation", r.homeReservation())
                .addValue("naverReceived", r.naverReceived())
                .addValue("naverRejected", r.naverRejected())
                .addValue("naverValid", r.naverValid())
                .addValue("naverReservation", r.naverReservation())
                .addValue("kakaoInquiry", r.kakaoInquiry())
                .addValue("kakaoReservation", r.kakaoReservation())
                .addValue("cancelCallNaver", r.cancelCallNaver())
                .addValue("cancelHome", r.cancelHome())
                .addValue("cancelKakao", r.cancelKakao())
                .addValue("visit", r.visit())
                .addValue("noShowReservation", r.noShowReservation())
                .addValue("cancel", r.cancel());
    }

    private static SqlParameterSource toCataractParams(CataractStatsDailyRow r) {
        return new MapSqlParameterSource()
                .addValue("statDate", r.date())
                .addValue("period", periodOf(r.date()))
                .addValue("totalCataract", r.totalCataract())
                .addValue("totalPresbyopia", r.totalPresbyopia())
                .addValue("inboundCall", r.inboundCall())
                .addValue("answeredCall", r.answeredCall())
                .addValue("newExamInquiry", r.newExamInquiry())
                .addValue("newReInquiry", r.newReInquiry())
                .addValue("newPatient", r.newPatient())
                .addValue("tmTotalDb", r.tmTotalDb())
                .addValue("tmValidDb", r.tmValidDb())
                .addValue("tmReservation", r.tmReservation())
                .addValue("kakaoTotalInquiry", r.kakaoTotalInquiry())
                .addValue("kakaoCataractReservation", r.kakaoCataractReservation())
                .addValue("kakaoPresbyopiaReservation", r.kakaoPresbyopiaReservation())
                .addValue("onlineReservation", r.onlineReservation())
                .addValue("onlineNoShow", r.onlineNoShow())
                .addValue("cancelOnline", r.cancelOnline())
                .addValue("cancelCrm", r.cancelCrm())
                .addValue("cancelKakao", r.cancelKakao())
                .addValue("visit", r.visit())
                .addValue("noShowReservation", r.noShowReservation())
                .addValue("cancel", r.cancel());
    }

    /** "YYYY-MM-DD" → "YYYY-MM". 원본 date 문자열이 ISO 형식임을 전제. */
    static String periodOf(String isoDate) {
        return isoDate.substring(0, 7);
    }

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
