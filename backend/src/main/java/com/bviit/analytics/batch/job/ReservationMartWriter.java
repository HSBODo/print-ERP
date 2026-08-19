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

/**
 * 예약 도메인 마트 write 컴포넌트 — PR-4a.
 *
 * - 집계(monthly): upsert (ON CONFLICT DO UPDATE)
 * - 리스트(list_reservation): 등록일 범위 delete + 새 데이터 insert
 *
 * 트랜잭션 경계는 각 메서드 단위. 배치 잡이 여러 write를 하나로 묶고 싶으면 상위에서 감싼다.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationMartWriter {

    private static final String UPSERT_MONTHLY_SQL          = SqlLoader.load("sql/mart/upsert-reservation-monthly.sql");
    private static final String UPSERT_OVERALL_MONTHLY_SQL  = SqlLoader.load("sql/mart/upsert-reservation-overall-monthly.sql");
    private static final String DELETE_LIST_RANGE_SQL       = SqlLoader.load("sql/mart/delete-list-reservation-range.sql");
    private static final String INSERT_LIST_SQL             = SqlLoader.load("sql/mart/insert-list-reservation.sql");
    private static final String DELETE_LIST_ALL_RANGE_SQL   = SqlLoader.load("sql/mart/delete-list-reservation-all-range.sql");
    private static final String INSERT_LIST_ALL_SQL         = SqlLoader.load("sql/mart/insert-list-reservation-all.sql");

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
     * 예약 전체 얇은 리스트 — 예약일(reserve_date) 기준 범위 delete + insert.
     * 사후 예약일 변경/취소도 자연히 반영된다.
     *
     * mart_reservation_monthly(수술/외래/드림렌즈)의 정의 원천 — 위 리스트를 월로 접어 만든다.
     */
    @Transactional
    public int replaceListReservationAll(LocalDate from, LocalDate to, List<Map<String, Object>> rows) {
        int deleted = jdbc.update(
                DELETE_LIST_ALL_RANGE_SQL,
                new MapSqlParameterSource()
                        .addValue("from", from, Types.DATE)
                        .addValue("to", to, Types.DATE)
        );
        if (rows.isEmpty()) {
            log.info("list_reservation_all deleted={} inserted=0 (empty)", deleted);
            return 0;
        }
        SqlParameterSource[] batch = rows.stream()
                .map(ReservationMartWriter::toListAllParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(INSERT_LIST_ALL_SQL, batch);
        int inserted = sum(updated);
        log.info("list_reservation_all deleted={} inserted={}", deleted, inserted);
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

    /**
     * reservation-list-all.sql 의 alias 6개를 파라미터로 매핑. 얇은 리스트라 LIST_KEYS 배열 불필요.
     * 날짜는 문자열 그대로 넘겨(insert SQL 에서 CAST), 나머지는 trim 만 한다.
     * chart_no·reserve_num 은 Phase 2 예약률·상담성공률에서 list_exam·list_surgery 와 JOIN 키로 쓴다.
     */
    private static SqlParameterSource toListAllParams(Map<String, Object> row) {
        return new MapSqlParameterSource()
                .addValue("reserveDate",   nullSafeTrim(row.get("reserveDate")))
                .addValue("reserveFlag",   nullSafeTrim(row.get("reserveFlag")))
                .addValue("reserveJinryo", nullSafeTrim(row.get("reserveJinryo")))
                .addValue("reserveState",  nullSafeTrim(row.get("reserveState")))
                .addValue("chartNo",       nullSafeTrim(row.get("chartNo")))
                .addValue("reserveNum",    nullSafeTrim(row.get("reserveNum")));
    }

    private static String nullSafeTrim(Object v) {
        return v == null ? "" : v.toString().trim();
    }

    private static final String[] LIST_KEYS = new String[]{
            "registeredAt", "registeredTime",
            "reserveDate", "reserveTime",
            "chartNo", "name", "reserveState",
            "channel", "channelGroup",
            "doctor", "counselor", "comment", "motiveL", "motiveM", "motiveMSource",
            "examRegDate", "examStop", "surgeryRegDate", "surgeryDate", "surgeryPayment", "surgeryR", "surgeryL",
            // 사람 식별용 — 화면·CSV 로는 안 나간다(select-list-reservation.sql 이 뽑지 않음)
            "hp", "email"
    };

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
