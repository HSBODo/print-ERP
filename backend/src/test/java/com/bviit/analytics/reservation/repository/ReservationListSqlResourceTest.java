package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationListSqlResourceTest {

    @Test
    void mssql_reservation_list_sql은_named_parameter와_제외필터를_보존한다() {
        String sql = SqlLoader.load(ReservationListRepository.SQL_MSSQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM RESERVATION r WITH(NOLOCK)")
                .contains("r.InsertedDateTime >= :from")
                .contains("r.InsertedDateTime < DATEADD(DAY, 1, CONVERT(datetime, :to))")
                .contains("r.RESERVE_FLAG = 'M'")
                .contains("r.RESERVE_JINRYO IN ('', '5', '6', '7', '24', '25')")
                .contains("r.RESERVE_PATH IN ('CTI', 'CRM', 'ONLINE', 'APP', 'NAVER')")
                .contains("ISNULL(r.RESERVE_SEQ, '') NOT IN ('8', '5')")
                .contains("'%B2B(군인)%'", "'%재검%'", "'%중복%'", "'%시뮬%'", "'%차트있음%'")
                .contains("N'재검가능성', ''")
                .contains("N'재검사안내', ''")
                .contains("N'재검필요', ''")
                .contains("NOT LIKE '%재검%'")
                .contains("ORDER BY r.InsertedDateTime, r.RESERVE_NUM")
                .doesNotContain("OPENQUERY", "__OQ_");
    }

    @Test
    void mssql_reservation_list_sql은_TMDB_CRM_MEMO_순으로_내원동기를_뽑는다() {
        String sql = SqlLoader.load(ReservationListRepository.SQL_MSSQL);

        assertThat(sql)
                .contains("FROM DB_CUSTOM d WITH(NOLOCK)")
                .contains("LIKE N'%모두닥%'")
                .contains("CASE WHEN tmdb.hit = 1 THEN N'모두닥'")
                .contains("CASE WHEN tmdb.hit = 1 THEN 'TMDB'")
                .contains("WHEN ISNULL(mv.motiveM, '') <> '' THEN 'CRM'")
                .contains("WHEN ISNULL(resolvedMemoMv.motiveM, '') <> '' THEN 'MEMO'")
                .contains("CHARINDEX(N'TM고객(', r.COMMENT)")
                .contains("CHARINDEX(N'CTI고객(', r.COMMENT)");
    }

    @Test
    void warehouse_reservation_list_sql은_Postgres_방언과_raw_스키마를_사용한다() {
        String sql = SqlLoader.load(ReservationListRepository.SQL_WAREHOUSE);

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
    void mssql_reservation_list_all_sql은_수술_외래_드림렌즈_필터를_보존한다() {
        String sql = SqlLoader.load(ReservationListRepository.SQL_ALL_MSSQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM RESERVATION r WITH(NOLOCK)")
                .contains("r.RESERVE_STATE <> 'C'")
                .contains("r.RESERVE_FLAG = 'O' OR r.RESERVE_FLAG = 'D' OR r.RESERVE_JINRYO = '2'");
    }

    @Test
    void warehouse_reservation_list_all_sql은_Postgres_방언과_raw_스키마를_사용한다() {
        String sql = SqlLoader.load(ReservationListRepository.SQL_ALL_WAREHOUSE);

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
