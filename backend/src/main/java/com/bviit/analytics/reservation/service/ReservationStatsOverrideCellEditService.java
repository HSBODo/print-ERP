package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.repository.ReservationStatsOverrideRepository;
import com.bviit.analytics.reservation.repository.ReservationStatsSystemMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 예약통계_시력교정 — Postgres 마트 기반 셀 수기 보정.
 *
 * INSERT-only 이력 테이블(reservation_stats_override)에 새 값을 append 후,
 * 마트에서 해당 일자를 재조회해 SQL COALESCE 로 오버레이된 최신 row 를 반환한다.
 * 잠긴 월(reservation_stats_period_lock) 이어도 손보정은 허용한다 — 값 정정이 바로 그 용도이며 이력으로 추적.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationStatsOverrideCellEditService {

    static final Set<String> EDITABLE_FIELDS = Set.of(
            "homeReceived", "homeReservation",
            "naverReceived", "naverRejected", "naverValid", "naverReservation"
    );

    /** DTO camelCase → 마트 컬럼 snake_case. override 조회 SQL의 field_name 과 동일 문자열이어야 한다. */
    private static final Map<String, String> COLUMN_BY_FIELD = Map.of(
            "homeReceived",     "home_received",
            "homeReservation",  "home_reservation",
            "naverReceived",    "naver_received",
            "naverRejected",    "naver_rejected",
            "naverValid",       "naver_valid",
            "naverReservation", "naver_reservation"
    );

    private static final int MAX_VALUE = 100_000;
    private static final String PRODUCT_TYPE = "SYSTEM";

    private final ReservationStatsOverrideRepository overrideRepository;
    private final ReservationStatsSystemMartRepository martRepository;

    @Transactional
    public ReservationStatsDailyRow editCell(String period, String date, String field, int value, String editedBy) {
        if (!EDITABLE_FIELDS.contains(field)) {
            throw new IllegalArgumentException("수정할 수 없는 필드입니다: " + field);
        }
        if (value < 0 || value > MAX_VALUE) {
            throw new IllegalArgumentException("값은 0 이상 " + MAX_VALUE + " 이하여야 합니다: " + value);
        }
        if (date == null || !date.startsWith(period + "-")) {
            throw new IllegalArgumentException("일자가 해당 월에 속하지 않습니다: date=" + date + ", period=" + period);
        }
        String by = editedBy == null || editedBy.isBlank() ? "unknown" : editedBy;

        overrideRepository.insert(PRODUCT_TYPE, date, COLUMN_BY_FIELD.get(field), value, null, by);

        List<ReservationStatsDailyRow> rows = martRepository.findDailyCounts(date, date);
        if (rows.isEmpty()) {
            throw new IllegalStateException("마트에 해당 일자가 없어 보정 후 재조회에 실패했습니다: " + date);
        }
        return rows.get(0);
    }
}
