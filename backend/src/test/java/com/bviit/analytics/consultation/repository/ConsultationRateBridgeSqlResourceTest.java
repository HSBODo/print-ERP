package com.bviit.analytics.consultation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 브릿지 SQL(warehouse) 의 계약 잠금. */
class ConsultationRateBridgeSqlResourceTest {

    @Test
    void warehouse_O예약_SQL은_raw_스키마와_소문자_컬럼을_사용한다() {
        String sql = SqlLoader.load(ConsultationRateBridgeRepository.O_RESERVATION_SUMMARY_SQL);

        assertThat(sql)
                .contains(":chartNos")
                .contains("FROM raw.raw_crm_reservation r")
                .contains("r.reserve_flag='O'").contains("r.reserve_jinryo='4'")
                .contains("AS \"chartNo\"").contains("AS \"minOAny\"").contains("AS \"maxOAny\"")
                .contains("AS \"minOCataract\"").contains("AS \"maxOCataract\"")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("WITH (NOLOCK)");
    }

    @Test
    void warehouse_수술_SQL은_raw_operationdata_와_COALESCE_를_사용한다() {
        String sql = SqlLoader.load(ConsultationRateBridgeRepository.OP_SUMMARY_SQL);

        assertThat(sql)
                .contains(":chartNos")
                .contains("FROM raw.raw_crm_operationdata od")
                .contains("COALESCE(od.operation_date, '')")
                .contains("AS \"chartNo\"").contains("AS \"minOpDate\"").contains("AS \"maxOpDate\"")
                .doesNotContain("ISNULL(").doesNotContain("WITH(NOLOCK)");
    }
}
