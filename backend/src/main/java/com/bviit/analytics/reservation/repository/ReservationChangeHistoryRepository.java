package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.reservation.service.ReservationChangeChainBuilder.HistoryStep;
import com.bviit.analytics.reservation.service.ReservationChangeChainBuilder.Source;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

/**
 * 예약 변경이력 원천(RESERVE_HISTORY) 읽기 — {@code ReservationChangeMartJob} 의 배치 read-side.
 *
 * <p>행이 RESERVE_NUM 순으로 오므로 스트리밍하며 예약 1건씩 묶어 consumer 에 넘긴다.
 * 초기 백필(2022~)은 이력 수십만 행이라 List 로 다 받으면 메모리가 위험하다.
 *
 * <p>READ-ONLY · 범위는 "이력이 저장된 기간"(HISTORY_TIME) — 등록일이 아니다(SQL 주석 참조).
 *
 * <p><b>소스 라우팅 (data-platform 프로파일)</b>
 * <ul>
 *   <li>기본: CRM 직접연결 (statsJdbcTemplate, MSSQL SOFTCRM.RESERVATION + RESERVE_HISTORY)
 *       + SQL {@link #SQL_MSSQL}. MSSQL 2014 호환 (STRING_AGG·TRY_CONVERT·TRIM 금지).</li>
 *   <li>data-platform 프로파일 활성: 데이터 플랫폼 (warehouseJdbcTemplate, bnviit_datawarehouse.raw_crm_reservation
 *       + raw_crm_reserve_history) + SQL {@link #SQL_WAREHOUSE}. Postgres 방언.</li>
 * </ul>
 *
 * <p>정본 전략: {@code docs/data-platform/migration-strategy.md}.
 * 이관 이력: 2026-09-29 Wave 1 — 배치 파이프라인이 웨어하우스 → 마트로 첫 스위치.
 */
@Repository
@Profile("postgres-mart")
public class ReservationChangeHistoryRepository {

    static final String SQL_MSSQL = "sql/softcrm/reservation/history/select-reservation-change-history.sql";
    static final String SQL_WAREHOUSE = "sql/warehouse/reservation/history/select-reservation-change-history.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String sql;

    public ReservationChangeHistoryRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate statsJdbc,
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc,
            @Value("${data-platform.enabled:false}") boolean dataPlatformEnabled
    ) {
        this.jdbc = dataPlatformEnabled ? warehouseJdbc : statsJdbc;
        this.sql = SqlLoader.load(dataPlatformEnabled ? SQL_WAREHOUSE : SQL_MSSQL);
    }

    /**
     * from~to 에 이력이 저장된 검사예약을 예약 단위로 묶어 consumer 에 넘긴다.
     *
     * @return 넘긴 예약 건수
     */
    public int forEachReservation(String from, String to, Consumer<Source> consumer) {
        Grouper grouper = new Grouper(consumer);
        jdbc.query(sql, new MapSqlParameterSource().addValue("from", from).addValue("to", to), grouper::accept);
        grouper.flush();
        return grouper.count;
    }

    /** RESERVE_NUM 이 바뀌는 지점에서 직전 예약을 내보낸다. */
    private static final class Grouper {
        private final Consumer<Source> consumer;
        private String reserveNum;
        private String chartNo, name, branch, reserveState, finalDate, insertedAt;
        private List<HistoryStep> history = new ArrayList<>();
        private int count;

        private Grouper(Consumer<Source> consumer) {
            this.consumer = consumer;
        }

        void accept(ResultSet rs) throws SQLException {
            String num = rs.getString("reserveNum");
            if (reserveNum != null && !reserveNum.equals(num)) {
                flush();
            }
            if (reserveNum == null) {
                reserveNum = num;
                chartNo = rs.getString("chartNo");
                name = rs.getString("name");
                branch = rs.getString("branch");
                reserveState = rs.getString("reserveState");
                finalDate = rs.getString("finalDate");
                insertedAt = rs.getString("insertedAt");
                history = new ArrayList<>();
            }
            history.add(new HistoryStep(rs.getString("historyTime"), rs.getString("historyNum"), rs.getString("historyDate")));
        }

        void flush() {
            if (reserveNum == null) return;
            consumer.accept(new Source(reserveNum, chartNo, name, branch, reserveState, finalDate, insertedAt, history));
            count++;
            reserveNum = null;
            history = new ArrayList<>();
        }
    }
}
