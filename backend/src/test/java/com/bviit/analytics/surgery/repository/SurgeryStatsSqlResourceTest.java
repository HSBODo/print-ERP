package com.bviit.analytics.surgery.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 수술 통계 SQL(warehouse) 의 계약 잠금. */
class SurgeryStatsSqlResourceTest {

    @Test
    void warehouse_vision_monthly_sql은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(SurgeryStatsRepository.FIND_VISION_MONTHLY_BY_TYPE_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_crm_operationdata")
                .contains("raw.raw_crm_cataract_operationdata")
                .contains("raw.raw_crm_custom")
                .contains("SUBSTRING(e.op_date FROM 1 FOR 4)")
                .contains("SUBSTRING(e.op_date FROM 6 FOR 2)")
                .contains("ROW_NUMBER() OVER")
                .contains("AS \"smilePro\"", "AS \"tIcl\"", "AS \"tKpl\"",
                          "AS \"piolPatients\"", "AS \"visionPatients\"",
                          "AS \"waveVision\"", "AS \"monoVision\"",
                          "AS \"lasekEx\"", "AS \"lasekRed\"")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("ISNULL(")
                .doesNotContain("YEAR(").doesNotContain("MONTH(");
    }

    @Test
    void warehouse_cataract_monthly_sql은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(SurgeryStatsRepository.FIND_CATARACT_MONTHLY_BY_TYPE_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_crm_cataract_operationdata")
                .contains("raw.raw_crm_custom")
                .contains("SUBSTRING(e.op_date FROM 1 FOR 4)")
                .contains("TRIM(COALESCE(c.cust_num, '')) || '|'")
                .contains("AS \"catMulti\"", "AS \"catMono\"", "AS \"catEdof\"", "AS \"cataractPatients\"")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("ISNULL(")
                .doesNotContain("YEAR(").doesNotContain("MONTH(");
    }

    @Test
    void warehouse_vision_daily_sql은_dt_컬럼과_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(SurgeryStatsRepository.FIND_VISION_DAILY_BY_TYPE_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_crm_operationdata")
                .contains("SUBSTRING(e.op_date FROM 1 FOR 10) AS dt")
                .contains("AS \"smilePro\"", "AS \"visionPatients\"")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("CONVERT(char");
    }

    @Test
    void warehouse_cataract_daily_sql은_dt_컬럼과_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(SurgeryStatsRepository.FIND_CATARACT_DAILY_BY_TYPE_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_crm_cataract_operationdata")
                .contains("SUBSTRING(e.op_date FROM 1 FOR 10) AS dt")
                .contains("AS \"catMulti\"", "AS \"cataractPatients\"")
                .doesNotContain("WITH(NOLOCK)").doesNotContain("CONVERT(char")
                .doesNotContain("CONVERT(date");
    }
}
