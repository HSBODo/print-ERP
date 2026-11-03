package com.bviit.analytics.sms.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** SmsCrm 연락처 조회 SQL(warehouse) 의 계약 잠금. */
class SmsCrmContactSqlResourceTest {

    @Test
    void warehouse_sql은_raw_스키마와_LIMIT을_사용한다() {
        String sql = SqlLoader.load(SmsCrmContactRepository.SELECT_PHONE_SQL);

        assertThat(sql)
                .contains(":chartNo")
                .contains("raw.raw_crm_custom")
                .contains("LIMIT 1")
                .contains("COALESCE(c.call_num2, '')", "COALESCE(c.call_num1, '')")
                .contains("TRIM(c.cust_num)")
                .contains("AS phone")
                .doesNotContain("SELECT TOP", "WITH(NOLOCK)", "ISNULL(", "LTRIM(RTRIM(");
    }
}
