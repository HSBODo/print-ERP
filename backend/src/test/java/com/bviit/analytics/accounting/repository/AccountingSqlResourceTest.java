package com.bviit.analytics.accounting.repository;

import com.bviit.analytics.common.util.OpenQuerySql;
import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 회계 SQL 리소스의 계약 토큰을 잠근다 — 바인딩 방식·소스 테이블·필수 컬럼 별칭. */
class AccountingSqlResourceTest {

    @Test
    void 의사랑_안쪽_쿼리는_치환_플레이스홀더만_쓰고_바인딩_파라미터를_쓰지_않는다() {
        String receipts = SqlLoader.load(MedicalReceiptSourceRepository.RECEIPTS_SQL);
        assertThat(receipts)
                .contains("__OQ_FROM__", "__OQ_TO__", "IPLUS.dbo.PAOSUNAB_New", "IPLUS.dbo.PAISUNAB_New", "IPLUS.dbo.PAYTRANS")
                .contains("AS receiptDate", "AS chartNo", "AS serialNo", "AS revenueType", "AS cashReceipt");
        // 주석을 걷어낸 실제 문장에는 바인딩 파라미터·중첩 OPENQUERY 가 없어야 한다.
        assertThat(OpenQuerySql.wrapForIplus(receipts, "2026-01-01", "2026-01-31"))
                .doesNotContain(":from", ":to", "__OQ_")
                .containsOnlyOnce("OPENQUERY(");

        String monthly = SqlLoader.load(MedicalReceiptSourceRepository.MONTHLY_SQL);
        assertThat(monthly)
                .contains("__OQ_FROM__", "'out'", "'in'", "'pt'", "'pt80'", "'gs'", "2026-01-01",
                        "IPLUS.dbo.PAOSUNAB_New", "IPLUS.dbo.PAISUNAB_New", "IPLUS.dbo.NHICM4AP");
        assertThat(OpenQuerySql.wrapForIplus(monthly, "2026-01-01", "2026-01-31"))
                // 구 테이블(2026 이전)·신 테이블(2026~) 둘 다 읽는다
                .contains("IPLUS.dbo.PAOSUNAB WHERE", "IPLUS.dbo.PAISUNAB WHERE")
                .doesNotContain(":from", ":to", "__OQ_")
                .containsOnlyOnce("OPENQUERY(");
    }

    @Test
    void SOFTCRM_시력교정_쿼리는_수납일_바인딩과_NOLOCK을_쓴다() {
        for (String location : new String[]{
                VisionReceiptSourceRepository.PAYMENTS_SQL, VisionReceiptSourceRepository.ITEM_DETAILS_SQL,
                VisionReceiptSourceRepository.ITEMS_SQL, VisionReceiptSourceRepository.OPERATIONS_SQL}) {
            assertThat(SqlLoader.load(location)).as(location)
                    .contains(":from", ":to", "WITH(NOLOCK)", "AS custNum")
                    .doesNotContain("OPENQUERY", "STRING_AGG")
                    .doesNotContainPattern("(?<![LR])TRIM\\(");   // MSSQL 2014 — TRIM 금지 (LTRIM/RTRIM 만)
        }
        assertThat(SqlLoader.load(VisionReceiptSourceRepository.PAYMENTS_SQL))
                .contains("CstPrcSub", "AS cancelYn", "AS modifiedAt", "AS acquirerName", "AS cardCode", "AS approvalNo");
        assertThat(SqlLoader.load(VisionReceiptSourceRepository.ITEM_DETAILS_SQL)).contains("PrcItmDtl", "AS itemCode", "AS subSeq");
        assertThat(SqlLoader.load(VisionReceiptSourceRepository.ITEMS_SQL)).contains("PrcItmLst", "PrcItmQty * p.PrcItmPrc");
        assertThat(SqlLoader.load(VisionReceiptSourceRepository.OPERATIONS_SQL)).contains("OPERATIONDATA", "AS operationDate");
    }

    @Test
    void 마트_조회_SQL은_프런트_계약_키를_camelCase_별칭으로_낸다() {
        assertThat(SqlLoader.load("sql/mart/accounting/select-list-medical-receipt.sql"))
                .contains("\"id\"", "\"receiptDate\"", "\"insuranceType\"", "\"status\"", "\"closed\"",
                        "\"outstandingRecovered\"", "\"cashReceipt\"", ":from", ":to");
        assertThat(SqlLoader.load("sql/mart/accounting/select-list-vision-receipt.sql"))
                .contains("\"id\"", "\"chartNo\"", "\"patientName\"", "\"itemAmounts\"", "\"taxable\"", "\"exempt\"");
        assertThat(SqlLoader.load("sql/mart/accounting/select-medical-receipt-monthly-from-list.sql"))
                .contains(":years", ":receiptType", ":cataract", "serial_no = 98", "actual_paid + outstanding_recovered");
        assertThat(SqlLoader.load("sql/mart/accounting/select-vision-receipt-monthly.sql"))
                .contains(":years", "\"count\"", "\"amount\"");
    }
}
