package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationChangeHistorySqlResourcesTest {

    @Test
    void mssql_select_reservation_change_history_는_MSSQL_방언과_필터를_보존한다() {
        String sql = SqlLoader.load(ReservationChangeHistoryRepository.SQL_MSSQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM RESERVATION r WITH(NOLOCK)")
                .contains("JOIN RESERVE_HISTORY h WITH(NOLOCK)")
                .contains("r.RESERVE_FLAG IN ('M', 'D', 'H')")
                .contains("CONVERT(datetime, :from)")
                .contains("DATEADD(DAY, 1, CONVERT(datetime, :to))")
                .contains("LIKE '%테스트%'")
                .contains("LIKE '%TEST%'")
                .contains("NOT LIKE '8888%'")
                .contains("NOT LIKE '9999%'")
                .contains("ORDER BY r.RESERVE_NUM, h.HISTORY_NUM");
    }

    @Test
    void warehouse_select_reservation_change_history_는_Postgres_방언으로_동일_필터를_보존한다() {
        String sql = SqlLoader.load(ReservationChangeHistoryRepository.SQL_WAREHOUSE);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("WITH matched_reservations AS")
                .contains("SELECT DISTINCT reserve_num")
                .contains("FROM raw.raw_crm_reserve_history")
                .contains("history_time >= :from")
                .contains("history_time <  (CAST(:to AS date) + INTERVAL '1 day')::text")
                .contains("FROM raw.raw_crm_reservation r")
                .contains("JOIN matched_reservations mr ON mr.reserve_num = r.reserve_num")
                .contains("JOIN raw.raw_crm_reserve_history h ON h.reserve_num = r.reserve_num")
                .contains("r.reserve_flag IN ('M', 'D', 'H')")
                .contains("LIKE '%테스트%'")
                .contains("LIKE '%TEST%'")
                .contains("NOT LIKE '8888%'")
                .contains("NOT LIKE '9999%'")
                .contains("ORDER BY r.reserve_num, h.history_num");
    }
}
