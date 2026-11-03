package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationListSqlResourceTest {

    @Test
    void warehouse_reservation_list_sql은_Postgres_방언과_raw_스키마를_사용한다() {
        String sql = SqlLoader.load(ReservationListRepository.SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM raw.raw_crm_reservation r")
                .contains("FROM raw.raw_crm_operationdata op")
                .contains("FROM raw.raw_crm_cataract_operationdata c")
                .contains("FROM raw.raw_crm_costprice cp")
                .contains("FROM raw.raw_crm_exam e")
                .contains("FROM raw.raw_crm_motive_new02 m2")
                .contains("FROM raw.raw_crm_employee e")
                .contains("FROM raw.raw_crm_db_custom d")
                .contains("r.inserteddatetime >= CAST(:from AS timestamp)")
                .contains("r.inserteddatetime < CAST(:to AS timestamp) + interval '1 day'")
                .contains("r.reserve_flag = 'M'")
                .contains("r.reserve_jinryo IN ('', '5', '6', '7', '24', '25')")
                .contains("r.reserve_path IN ('CTI', 'CRM', 'ONLINE', 'APP', 'NAVER')")
                .contains("COALESCE(r.reserve_seq::text, '') NOT IN ('8', '5')")
                .contains("NOT LIKE '%재검%'")
                .contains("POSITION('TM고객('")
                .contains("POSITION('CTI고객('")
                .contains("CHR(13)", "CHR(10)")
                .contains("LEFT JOIN LATERAL")
                .contains("CROSS JOIN LATERAL")
                .contains("LIMIT 1")
                .contains("AS \"registeredAt\"")
                .contains("AS \"motiveM\"")
                .contains("AS \"motiveMSource\"")
                .contains("AS \"surgeryPayment\"");
    }

    @Test
    void warehouse_reservation_list_all_sql은_Postgres_방언과_raw_스키마를_사용한다() {
        String sql = SqlLoader.load(ReservationListRepository.SQL_ALL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM raw.raw_crm_reservation r")
                .contains("r.reserve_state <> 'C'")
                .contains("r.reserve_flag = 'O' OR r.reserve_flag = 'D' OR r.reserve_jinryo = '2'")
                .contains("SUBSTRING(r.reserve_date FROM 1 FOR 10)")
                .contains("AS \"reserveDate\"")
                .contains("AS \"reserveNum\"");
    }
}
