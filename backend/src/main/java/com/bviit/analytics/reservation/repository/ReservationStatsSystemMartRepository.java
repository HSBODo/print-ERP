package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.reservation.dto.ReservationStatsCellEdit;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
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
 * 예약통계_시력교정 — Postgres 마트 read.
 *
 * mart_reservation_stats_system_daily 원본에 reservation_stats_override 의 최신 보정값을
 * COALESCE 로 얹어 응답한다(override 없으면 원본 그대로). 배치가 채운 D-1 데이터가 유일한 진실.
 * manualEdits 이력은 별도 조회 후 각 row 에 부착 — UI 셀 마커·툴팁 근거.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationStatsSystemMartRepository {

    private static final String SELECT_SQL =
            SqlLoader.load("sql/mart/reservation/select-reservation-stats-system-daily.sql");
    private static final String SELECT_MONTHLY_CHANNEL_SUMS_SQL =
            SqlLoader.load("sql/mart/reservation/select-reservation-stats-system-monthly-channel-sums.sql");

    /** 마트 컬럼(snake_case) → API 필드(camelCase). OverrideCellEditService.COLUMN_BY_FIELD 의 역매핑. */
    private static final Map<String, String> FIELD_BY_COLUMN = Map.of(
            "home_received",     "homeReceived",
            "home_reservation",  "homeReservation",
            "naver_received",    "naverReceived",
            "naver_rejected",    "naverRejected",
            "naver_valid",       "naverValid",
            "naver_reservation", "naverReservation"
    );

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;
    private final ReservationStatsOverrideRepository overrideRepository;

    /**
     * (yr, mo) 별 예약 종합 계산에 필요한 채널 예약수 합계.
     * reservation_stats_override 오버레이 반영 — 셀 편집이 즉시 반영되어야 한다.
     *
     * 반환 컬럼:
     *   - yr, mo
     *   - naver_cnt, kakao_cnt (온라인)
     *   - call_reservation_cnt, tm_reservation_cnt, tm_recounsel_reservation_cnt (콜)
     */
    public List<Map<String, Object>> findMonthlyChannelReservationSums(String from, String to) {
        return jdbc.queryForList(SELECT_MONTHLY_CHANNEL_SUMS_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to));
    }

    public List<ReservationStatsDailyRow> findDailyCounts(String from, String to) {
        List<ReservationStatsDailyRow> base = jdbc.query(SELECT_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, n) -> new ReservationStatsDailyRow(
                        rs.getString("date"),
                        rs.getInt("inbound_call"), rs.getInt("answered_call"),
                        rs.getInt("new_inquiry"), rs.getInt("call_reservation"),
                        rs.getInt("tm_total_db"), rs.getInt("tm_valid_db"), rs.getInt("tm_reservation"),
                        rs.getInt("tm_recounsel"), rs.getInt("tm_recounsel_valid"), rs.getInt("tm_recounsel_reservation"),
                        rs.getInt("home_received"), rs.getInt("home_reservation"),
                        rs.getInt("naver_received"), rs.getInt("naver_rejected"),
                        rs.getInt("naver_valid"), rs.getInt("naver_reservation"),
                        rs.getInt("kakao_inquiry"), rs.getInt("kakao_reservation"),
                        rs.getInt("cancel_call_naver"), rs.getInt("cancel_home"), rs.getInt("cancel_kakao"),
                        rs.getInt("visit"), rs.getInt("no_show_reservation"), rs.getInt("cancel")));

        Map<String, List<ReservationStatsCellEdit>> editsByDate = loadEditsByDate(from, to);
        if (editsByDate.isEmpty()) return base;

        List<ReservationStatsDailyRow> merged = new ArrayList<>(base.size());
        for (ReservationStatsDailyRow r : base) {
            List<ReservationStatsCellEdit> edits = editsByDate.get(r.date());
            merged.add(edits == null ? r : withEdits(r, edits));
        }
        return merged;
    }

    private Map<String, List<ReservationStatsCellEdit>> loadEditsByDate(String from, String to) {
        Map<String, List<ReservationStatsCellEdit>> out = new HashMap<>();
        for (var a : overrideRepository.findAudits("SYSTEM", from, to)) {
            String apiField = FIELD_BY_COLUMN.get(a.fieldName());
            if (apiField == null) continue;    // 알 수 없는 컬럼은 무시(스키마 확장 대비)
            out.computeIfAbsent(a.date(), k -> new ArrayList<>())
                    .add(new ReservationStatsCellEdit(apiField, a.overrideValue(), a.createdBy(), a.createdAt()));
        }
        return out;
    }

    private static ReservationStatsDailyRow withEdits(ReservationStatsDailyRow d, List<ReservationStatsCellEdit> edits) {
        return new ReservationStatsDailyRow(
                d.date(),
                d.inboundCall(), d.answeredCall(), d.newInquiry(), d.callReservation(),
                d.tmTotalDb(), d.tmValidDb(), d.tmReservation(),
                d.tmRecounsel(), d.tmRecounselValid(), d.tmRecounselReservation(),
                d.homeReceived(), d.homeReservation(),
                d.naverReceived(), d.naverRejected(), d.naverValid(), d.naverReservation(),
                d.kakaoInquiry(), d.kakaoReservation(),
                d.cancelCallNaver(), d.cancelHome(), d.cancelKakao(),
                d.visit(), d.noShowReservation(), d.cancel(),
                edits);
    }
}
