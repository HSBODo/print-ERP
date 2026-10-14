package com.bviit.analytics.consultation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 중단 사유 월별 집계 SQL 두 방언(MSSQL / warehouse) 의 계약 잠금 — RECONCILE wave (2026-10-06). */
class StopReasonStatsSqlResourceTest {

    @Test
    void mssql_sql은_중단사유_코드맵과_MSSQL_방언을_유지한다() {
        String sql = SqlLoader.load(StopReasonStatsRepository.FIND_STOP_REASON_MONTHLY_SQL_MSSQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM EXAM e WITH(NOLOCK)")
                .contains("ISNULL(e.CANCEL_CD, '')")
                .contains("STOP_YN = 'Y'")
                .contains("'121'", "'305'", "'122'", "'306'", "'399'", "'124'", "'310'", "'111'", "'303'", "'117'", "'127'")
                .contains("'recommendX'", "'lensImpossible'", "'keratoconus'", "'avellino'", "'glaucoma'", "'visionChange'", "'other'");
    }

    @Test
    void warehouse_sql은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(StopReasonStatsRepository.FIND_STOP_REASON_MONTHLY_SQL_WAREHOUSE);

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
