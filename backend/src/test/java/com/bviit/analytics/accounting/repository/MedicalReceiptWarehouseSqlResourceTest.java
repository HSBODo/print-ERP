package com.bviit.analytics.accounting.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** A8 warehouse SQL (receipts + monthly) 의 Postgres 방언·raw 스키마 잠금 (2026-10-06 unblock). */
class MedicalReceiptWarehouseSqlResourceTest {

    @Test
    void warehouse_receipts_sql은_raw_스키마와_네임드_바인딩을_사용한다() {
        String sql = SqlLoader.load(MedicalReceiptSourceRepository.RECEIPTS_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_emr_paosunab_new")
                .contains("raw.raw_emr_paisunab_new")
                .contains("raw.raw_emr_pmcptnt")
                .contains("raw.raw_emr_setkind")
                .contains("raw.raw_emr_picuserm")
                .contains("raw.raw_emr_pmootpth")
                .contains("raw.raw_emr_picroom")
                .contains("raw.raw_emr_nhicm4ap")
                .contains("raw.raw_emr_paytrans")
                .contains("raw.raw_emr_receiptcash")
                .contains("AS \"receiptDate\"", "AS \"chartNo\"", "AS \"serialNo\"",
                          "AS \"revenueType\"", "AS \"cashReceipt\"")
                .contains("TO_CHAR(A.modifydate, 'HH24:MI')")
                .contains("'외래'", "'입원'")
                .doesNotContain("__OQ_", "IPLUS.dbo", "ISNULL(", "CONVERT(varchar");
    }

    @Test
    void warehouse_monthly_sql은_raw_스키마와_7개_UNION을_유지한다() {
        String sql = SqlLoader.load(MedicalReceiptSourceRepository.MONTHLY_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("raw.raw_emr_paosunab", "raw.raw_emr_paosunab_new")
                .contains("raw.raw_emr_paisunab", "raw.raw_emr_paisunab_new")
                .contains("raw.raw_emr_paytrans", "raw.raw_emr_nhicm4ap")
                .contains("'out'", "'in'", "'pt'", "'pt80'", "'gs'")
                .contains("2026-01-01")
                .contains("SUBSTRING(수납일자 FROM 1 FOR 7)")
                .contains("SUBSTRING(입원일자 FROM 1 FOR 7)")
                .contains("SUBSTRING(\"date\" FROM 1 FOR 7)")
                .doesNotContain("__OQ_", "IPLUS.dbo", "LEFT(");
    }
}
