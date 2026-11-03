package com.bviit.analytics.consultation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 상담 전환율 SQL(warehouse) 의 계약 잠금. */
class ConsultationRateSqlResourceTest {

    @Test
    void warehouse_vision_rates_sql은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(ConsultationRateRepository.FIND_MONTHLY_VISION_RATES_SQL);

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
    void warehouse_cataract_rates_sql은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(ConsultationRateRepository.FIND_MONTHLY_CATARACT_RATES_SQL);

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
