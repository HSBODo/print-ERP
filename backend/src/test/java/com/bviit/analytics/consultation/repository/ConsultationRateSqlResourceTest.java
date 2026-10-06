package com.bviit.analytics.consultation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 상담 전환율 SQL 두 방언(MSSQL / warehouse) 의 계약 잠금 — RECONCILE wave 2 (2026-10-06). */
class ConsultationRateSqlResourceTest {

    @Test
    void mssql_vision_rates_sql은_EXAM_subquery_와_MSSQL_방언을_유지한다() {
        String sql = SqlLoader.load(ConsultationRateRepository.FIND_MONTHLY_VISION_RATES_SQL_MSSQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM EXAM E WITH(NOLOCK)")
                .contains("YEAR(E.EXAM_DATE)", "MONTH(E.EXAM_DATE)")
                .contains("ISNULL(E.STOP_YN,'')")
                .contains("RTRIM(ISNULL(E.OPERATIONR,''))")
                .contains("FROM RESERVATION WITH(NOLOCK)")
                .contains("FROM OPERATIONDATA WITH(NOLOCK)")
                .contains("AS counsel", "AS booked", "AS actual", "AS od")
                .contains("AS examCount", "AS counselCount", "AS surgeryBookedCount");
    }

    @Test
    void warehouse_vision_rates_sql은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(ConsultationRateRepository.FIND_MONTHLY_VISION_RATES_SQL_WAREHOUSE);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_crm_exam")
                .contains("raw.raw_crm_reservation")
                .contains("raw.raw_crm_operationdata")
                .contains("SUBSTRING(E.exam_date FROM 1 FOR 4)")
                .contains("SUBSTRING(E.exam_date FROM 6 FOR 2)")
                .contains("COALESCE(E.stop_yn,'')")
                .contains("RTRIM(COALESCE(E.operationr,''))")
                .contains("AS \"examCount\"", "AS \"counselCount\"", "AS \"surgeryBookedCount\"",
                          "AS \"counselOneday\"", "AS \"counselBookedGeneral\"")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("ISNULL(")
                .doesNotContain("YEAR(").doesNotContain("MONTH(");
    }

    @Test
    void mssql_cataract_rates_sql은_백내장_접수기준과_MSSQL_방언을_유지한다() {
        String sql = SqlLoader.load(ConsultationRateRepository.FIND_MONTHLY_CATARACT_RATES_SQL_MSSQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM RESERVATION D WITH(NOLOCK)")
                .contains("INNER JOIN CUSTOM B WITH(NOLOCK)")
                .contains("D.RESERVE_FLAG = 'H'")
                .contains("D.RESERVE_JINRYO <> '3'")
                .contains("D.RESERVE_STATE <> 'C'")
                .contains("D.CUST_NUM <> '9999999999999'")
                .contains("B.MY_optometrist", "B.MY_COUNSELOR = 'BS0808'");
    }

    @Test
    void warehouse_cataract_rates_sql은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(ConsultationRateRepository.FIND_MONTHLY_CATARACT_RATES_SQL_WAREHOUSE);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_crm_reservation")
                .contains("raw.raw_crm_custom")
                .contains("SUBSTRING(D.reserve_date FROM 1 FOR 4)")
                .contains("D.reserve_flag = 'H'")
                .contains("D.reserve_jinryo <> '3'")
                .contains("D.reserve_state <> 'C'")
                .contains("D.cust_num <> '9999999999999'")
                .contains("B.my_optometrist", "B.my_counselor = 'BS0808'")
                .contains("D.reserve_seq = 3")
                .contains("AS \"examCount\"", "AS \"surgeryBookedCount\"", "AS \"stoppedCount\"")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("ISNULL(")
                .doesNotContain("YEAR(").doesNotContain("MONTH(");
    }
}
