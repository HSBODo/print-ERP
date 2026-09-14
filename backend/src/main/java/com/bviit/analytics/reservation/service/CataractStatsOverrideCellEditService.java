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
 * 시력교정과 동일 패턴. 원시 카운트(21컬럼: 채널 18 + 종합 3) 전체를 손보정 가능.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class CataractStatsOverrideCellEditService {

    private static final Map<String, String> COLUMN_BY_FIELD = Map.ofEntries(
            Map.entry("totalCataract",              "total_cataract"),
            Map.entry("totalPresbyopia",            "total_presbyopia"),
            Map.entry("inboundCall",                "inbound_call"),
            Map.entry("answeredCall",               "answered_call"),
            Map.entry("newExamInquiry",             "new_exam_inquiry"),
            Map.entry("newReInquiry",               "new_re_inquiry"),
            Map.entry("newPatient",                 "new_patient"),
            Map.entry("tmTotalDb",                  "tm_total_db"),
            Map.entry("tmValidDb",                  "tm_valid_db"),
            Map.entry("tmReservation",              "tm_reservation"),
            Map.entry("kakaoTotalInquiry",          "kakao_total_inquiry"),
            Map.entry("kakaoCataractReservation",   "kakao_cataract_reservation"),
            Map.entry("kakaoPresbyopiaReservation", "kakao_presbyopia_reservation"),
            Map.entry("onlineReservation",          "online_reservation"),
            Map.entry("onlineNoShow",               "online_no_show"),
            Map.entry("cancelOnline",               "cancel_online"),
            Map.entry("cancelCrm",                  "cancel_crm"),
            Map.entry("cancelKakao",                "cancel_kakao"),
            Map.entry("visit",                      "visit"),
            Map.entry("noShowReservation",          "no_show_reservation"),
            Map.entry("cancel",                     "cancel")
    );

    static final Set<String> EDITABLE_FIELDS = COLUMN_BY_FIELD.keySet();

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
