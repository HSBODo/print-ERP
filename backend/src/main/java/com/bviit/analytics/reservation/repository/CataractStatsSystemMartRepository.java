package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.reservation.dto.CataractStatsCellEdit;
import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 예약통계_백내장 — Postgres 마트 read.
 *
 * mart_reservation_stats_cataract_daily 원본에 reservation_stats_override 의 최신 보정값을
 * COALESCE 로 얹어 응답한다. manualEdits 이력은 별도 조회 후 각 row 에 부착.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class CataractStatsSystemMartRepository {

    private static final String SELECT_SQL =
            SqlLoader.load("sql/mart/select-reservation-stats-cataract-daily.sql");
    private static final String SELECT_MONTHLY_CALL_SUMS_SQL =
            SqlLoader.load("sql/mart/select-reservation-stats-cataract-monthly-call-sums.sql");

    /** 마트 컬럼(snake_case) → API 필드(camelCase). 백내장은 인입콜/응대콜만 보정 대상. */
    private static final Map<String, String> FIELD_BY_COLUMN = Map.of(
            "inbound_call",  "inboundCall",
            "answered_call", "answeredCall"
    );

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;
    private final ReservationStatsOverrideRepository overrideRepository;

    /**
     * (yr, mo) 별 예약 종합 콜 계산에 필요한 백내장 채널 예약수 합계.
     * reservation_stats_override 오버레이 반영 — 셀 편집이 즉시 반영되어야 한다.
     *
     * 반환 컬럼:
     *   - yr, mo
     *   - new_patient_cnt        (인바운드 ★신환)
     *   - tm_reservation_cnt     (아웃바운드 예약수)
     */
    public List<Map<String, Object>> findMonthlyCallSums(String from, String to) {
        return jdbc.queryForList(SELECT_MONTHLY_CALL_SUMS_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to));
    }

    public List<CataractStatsDailyRow> findDailyCounts(String from, String to) {
        List<CataractStatsDailyRow> base = jdbc.query(SELECT_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, n) -> new CataractStatsDailyRow(
                        rs.getString("date"),
                        rs.getInt("total_cataract"), rs.getInt("total_presbyopia"),
                        rs.getInt("inbound_call"), rs.getInt("answered_call"),
                        rs.getInt("new_exam_inquiry"), rs.getInt("new_re_inquiry"), rs.getInt("new_patient"),
                        rs.getInt("tm_total_db"), rs.getInt("tm_valid_db"), rs.getInt("tm_reservation"),
                        rs.getInt("kakao_total_inquiry"),
                        rs.getInt("kakao_cataract_reservation"),
                        rs.getInt("kakao_presbyopia_reservation"),
                        rs.getInt("online_reservation"), rs.getInt("online_no_show"),
                        rs.getInt("cancel_online"), rs.getInt("cancel_crm"), rs.getInt("cancel_kakao"),
                        rs.getInt("visit"), rs.getInt("no_show_reservation"), rs.getInt("cancel")));

        Map<String, List<CataractStatsCellEdit>> editsByDate = loadEditsByDate(from, to);
        if (editsByDate.isEmpty()) return base;

        List<CataractStatsDailyRow> merged = new ArrayList<>(base.size());
        for (CataractStatsDailyRow r : base) {
            List<CataractStatsCellEdit> edits = editsByDate.get(r.date());
            merged.add(edits == null ? r : withEdits(r, edits));
        }
        return merged;
    }

    private Map<String, List<CataractStatsCellEdit>> loadEditsByDate(String from, String to) {
        Map<String, List<CataractStatsCellEdit>> out = new HashMap<>();
        for (var a : overrideRepository.findAudits("CATARACT", from, to)) {
            String apiField = FIELD_BY_COLUMN.get(a.fieldName());
            if (apiField == null) continue;
            out.computeIfAbsent(a.date(), k -> new ArrayList<>())
                    .add(new CataractStatsCellEdit(apiField, a.overrideValue(), a.createdBy(), a.createdAt()));
        }
        return out;
    }

    private static CataractStatsDailyRow withEdits(CataractStatsDailyRow d, List<CataractStatsCellEdit> edits) {
        return new CataractStatsDailyRow(
                d.date(), d.totalCataract(), d.totalPresbyopia(),
                d.inboundCall(), d.answeredCall(),
                d.newExamInquiry(), d.newReInquiry(), d.newPatient(),
                d.tmTotalDb(), d.tmValidDb(), d.tmReservation(),
                d.kakaoTotalInquiry(), d.kakaoCataractReservation(), d.kakaoPresbyopiaReservation(),
                d.onlineReservation(), d.onlineNoShow(),
                d.cancelOnline(), d.cancelCrm(), d.cancelKakao(),
                d.visit(), d.noShowReservation(), d.cancel(),
                edits);
    }
}
