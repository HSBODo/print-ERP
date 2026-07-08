package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.repository.CataractStatsSystemMartRepository;
import com.bviit.analytics.reservation.repository.ReservationStatsOverrideRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 예약통계_백내장 — Postgres 마트 기반 셀 수기 보정.
 * 시력교정과 동일 패턴. 백내장은 인입콜/응대콜만 손보정 대상(휴가일 어긋남 교정).
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class CataractStatsOverrideCellEditService {

    static final Set<String> EDITABLE_FIELDS = Set.of("inboundCall", "answeredCall");

    private static final Map<String, String> COLUMN_BY_FIELD = Map.of(
            "inboundCall",  "inbound_call",
            "answeredCall", "answered_call"
    );

    private static final int MAX_VALUE = 100_000;
    private static final String PRODUCT_TYPE = "CATARACT";

    private final ReservationStatsOverrideRepository overrideRepository;
    private final CataractStatsSystemMartRepository martRepository;

    @Transactional
    public CataractStatsDailyRow editCell(String period, String date, String field, int value, String editedBy) {
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

        List<CataractStatsDailyRow> rows = martRepository.findDailyCounts(date, date);
        if (rows.isEmpty()) {
            throw new IllegalStateException("마트에 해당 일자가 없어 보정 후 재조회에 실패했습니다: " + date);
        }
        return rows.get(0);
    }
}
