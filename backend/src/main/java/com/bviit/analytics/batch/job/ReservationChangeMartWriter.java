package com.bviit.analytics.batch.job;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.reservation.dto.ReservationChangeRow;
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
 * 예약 변경이력 마트(list_reservation_change) write — reserve_num 기준 upsert.
 *
 * <p>등록일 범위 delete+insert 를 쓰지 않는다. 변경은 등록 뒤 몇 달 뒤에도 일어나서
 * "이력이 저장된 기간" 으로 후보를 다시 읽고 예약 단위로 덮어써야 늦은 변경이 반영된다.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationChangeMartWriter {

    private static final String UPSERT_SQL = SqlLoader.load("sql/mart/reservation/upsert-list-reservation-change.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    @Transactional
    public int upsert(List<ReservationChangeRow> rows) {
        if (rows.isEmpty()) return 0;
        SqlParameterSource[] batch = rows.stream()
                .map(ReservationChangeMartWriter::toParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_SQL, batch);
        int total = 0;
        for (int c : updated) total += Math.max(c, 0);
        log.info("list_reservation_change upserted rows={}", total);
        return total;
    }

    private static SqlParameterSource toParams(ReservationChangeRow r) {
        return new MapSqlParameterSource()
                .addValue("reserveNum", r.reserveNum())
                .addValue("registeredAt", r.registeredAt())
                .addValue("registeredTime", r.registeredTime())
                .addValue("regSource", r.regSource())
                .addValue("chartNo", r.chartNo())
                .addValue("name", r.name())
                .addValue("branch", r.branch())
                .addValue("reserveState", r.reserveState())
                .addValue("firstDate", r.firstDate())
                .addValue("finalDate", r.finalDate())
                .addValue("changeCount", r.changeCount())
                .addValue("changeChain", r.changeChain())
                .addValue("lastChangedAt", r.lastChangedAt());
    }
}
