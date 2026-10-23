package com.bviit.analytics.consultation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 중단 사유 월별 집계 SQL(warehouse) 의 계약 잠금. */
class StopReasonStatsSqlResourceTest {

    @Test
    void warehouse_sql은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(StopReasonStatsRepository.FIND_STOP_REASON_MONTHLY_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_crm_exam")
                .contains("TRIM(COALESCE(e.cancel_cd, ''))")
                .contains("stop_yn = 'Y'")
                .contains("SUBSTRING(e.exam_date FROM 1 FOR 4)")
                .contains("SUBSTRING(e.exam_date FROM 6 FOR 2)")
                .contains("AS \"recommendX\"", "AS \"lensImpossible\"", "AS \"keratoconus\"",
                          "AS \"avellino\"", "AS \"glaucoma\"", "AS \"visionChange\"", "AS \"other\"")
                .contains("'121'", "'305'", "'122'", "'117'", "'127'")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("WITH (NOLOCK)")
                .doesNotContain("ISNULL(");
    }
}
