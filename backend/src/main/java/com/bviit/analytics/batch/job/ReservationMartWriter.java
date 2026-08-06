package com.bviit.analytics.batch.job;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Types;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

/**
 * 예약 도메인 마트 write 컴포넌트 — PR-4a.
 *
 * - 집계(monthly): upsert (ON CONFLICT DO UPDATE)
 * - 리스트(list_reservation): 등록일 범위 delete + 새 데이터 insert
 * - 카카오 일별(mart_reservation_kakao_daily): 범위 delete + insert (배치 재실행 시 정합 보장)
 *
 * 트랜잭션 경계는 각 메서드 단위. 배치 잡이 여러 write를 하나로 묶고 싶으면 상위에서 감싼다.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationMartWriter {

    private static final String UPSERT_MONTHLY_SQL         = SqlLoader.load("sql/mart/upsert-reservation-monthly.sql");
    private static final String UPSERT_OVERALL_MONTHLY_SQL = SqlLoader.load("sql/mart/upsert-reservation-overall-monthly.sql");
    private static final String DELETE_LIST_RANGE_SQL      = SqlLoader.load("sql/mart/delete-list-reservation-range.sql");
    private static final String INSERT_LIST_SQL            = SqlLoader.load("sql/mart/insert-list-reservation.sql");
    private static final String DELETE_KAKAO_RANGE_SQL     = SqlLoader.load("sql/mart/delete-kakao-daily-range.sql");
    private static final String UPSERT_KAKAO_DAILY_SQL     = SqlLoader.load("sql/mart/upsert-reservation-kakao-daily.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    @Transactional
    public int upsertMonthly(List<ReservationMonthlyItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(ReservationMartWriter::toMonthlyParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_MONTHLY_SQL, batch);
        int total = sum(updated);
        log.info("mart_reservation_monthly upserted rows={}", total);
        return total;
    }

    /**
     * 예약 종합(콜/온라인) 월별 upsert. reservations/online/call/total 은 null 저장 가능
     * (서비스가 미래월 또는 원천 미주입 시 null 반환 — 마트에도 그대로 저장).
     */
    @Transactional
    public int upsertOverallMonthly(List<ReservationOverallMonthlyItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(ReservationMartWriter::toOverallMonthlyParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_OVERALL_MONTHLY_SQL, batch);
        int total = sum(updated);
        log.info("mart_reservation_overall_monthly upserted rows={}", total);
        return total;
    }

    /**
     * 예약자 명단은 delete+insert. 등록일(registered_at) 기준 범위의 기존 행을 지우고 새로 삽입.
     * 사후 취소·수정도 자연스럽게 반영됨.
     */
    @Transactional
    public int replaceList(LocalDate from, LocalDate to, List<Map<String, Object>> rows) {
        int deleted = jdbc.update(
                DELETE_LIST_RANGE_SQL,
                new MapSqlParameterSource()
                        .addValue("from", from, Types.DATE)
                        .addValue("to", to, Types.DATE)
        );
        if (rows.isEmpty()) {
            log.info("list_reservation deleted={} inserted=0 (empty)", deleted);
            return 0;
        }
        SqlParameterSource[] batch = rows.stream()
                .map(ReservationMartWriter::toListParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(INSERT_LIST_SQL, batch);
        int inserted = sum(updated);
        log.info("list_reservation deleted={} inserted={}", deleted, inserted);
        return inserted;
    }

    /**
     * 카카오 일별 건수 — 범위 delete + insert.
     * 소스에서 사후 등록/수정된 카카오 예약도 반영된다.
     */
    @Transactional
    public int replaceKakaoDaily(LocalDate from, LocalDate to, List<Map<String, Object>> rows) {
        int deleted = jdbc.update(
                DELETE_KAKAO_RANGE_SQL,
                new MapSqlParameterSource()
                        .addValue("from", from, Types.DATE)
                        .addValue("to", to, Types.DATE)
        );
        if (rows.isEmpty()) {
            log.info("mart_reservation_kakao_daily deleted={} inserted=0 (empty)", deleted);
            return 0;
        }
        SqlParameterSource[] batch = rows.stream()
                .map(ReservationMartWriter::toKakaoDailyParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_KAKAO_DAILY_SQL, batch);
        int inserted = sum(updated);
        log.info("mart_reservation_kakao_daily deleted={} inserted={}", deleted, inserted);
        return inserted;
    }

    private static SqlParameterSource toMonthlyParams(ReservationMonthlyItem m) {
        return new MapSqlParameterSource()
                .addValue("yr", m.getYear())
                .addValue("mo", m.getMonth())
                .addValue("surgery", m.getSurgery())
                .addValue("outpatient", m.getOutpatient())
                .addValue("dreamlens", m.getDreamlens())
                .addValue("total", m.getTotal());
    }

    private static SqlParameterSource toOverallMonthlyParams(ReservationOverallMonthlyItem m) {
        return new MapSqlParameterSource()
                .addValue("yr", m.getYear())
                .addValue("mo", m.getMonth())
                .addValue("reservations", m.getReservations(), Types.INTEGER)
                .addValue("online", m.getOnline(), Types.INTEGER)
                .addValue("call", m.getCall(), Types.INTEGER)
                .addValue("total", m.getTotal(), Types.INTEGER);
    }

    /**
     * ReservationListRepository의 List&lt;Map&gt; 결과(원본 SQL alias camelCase)를 파라미터로 매핑.
     * reservation-list.sql의 SELECT alias와 1:1.
     */
    private static SqlParameterSource toListParams(Map<String, Object> row) {
        MapSqlParameterSource p = new MapSqlParameterSource();
        for (String k : LIST_KEYS) {
            Object v = row.get(k);
            // CRM 원본에 whitespace-only 값이 섞여 있어 trim 필수(surgery와 동일).
            p.addValue(k, v == null ? "" : v.toString().trim());
        }
        return p;
    }

    private static SqlParameterSource toKakaoDailyParams(Map<String, Object> row) {
        return new MapSqlParameterSource()
                .addValue("dt", LocalDate.parse(String.valueOf(row.get("dt")).trim()), Types.DATE)
                .addValue("kakaoCount", toInt(row.get("kakaoCount")));
    }

    private static final String[] LIST_KEYS = new String[]{
            "registeredAt", "registeredTime",
            "reserveDate", "reserveTime",
            "chartNo", "name", "reserveState",
            "channel", "channelGroup",
            "doctor", "counselor", "comment", "motiveL", "motiveM", "motiveMSource",
            "examRegDate", "examStop", "surgeryRegDate"
    };

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
