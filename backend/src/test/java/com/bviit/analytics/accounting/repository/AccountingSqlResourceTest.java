package com.bviit.analytics.accounting.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 회계 SQL 리소스의 계약 토큰을 잠근다 — 바인딩 방식·소스 테이블·필수 컬럼 별칭. */
class AccountingSqlResourceTest {

    @Test
    void 마트_조회_SQL은_프런트_계약_키를_camelCase_별칭으로_낸다() {
        assertThat(SqlLoader.load("sql/mart/accounting/select-list-medical-receipt.sql"))
                .contains("\"id\"", "\"receiptDate\"", "\"insuranceType\"", "\"status\"", "\"closed\"",
                        "\"outstandingRecovered\"", "\"cashReceipt\"", ":from", ":to");
        assertThat(SqlLoader.load("sql/mart/accounting/select-list-vision-receipt.sql"))
                .contains("\"id\"", "\"chartNo\"", "\"patientName\"", "\"itemAmounts\"", "\"taxable\"", "\"exempt\"");
        assertThat(SqlLoader.load("sql/mart/accounting/select-medical-receipt-monthly-from-list.sql"))
                .contains(":years", ":receiptType", ":cataract", "serial_no = 98", "actual_paid + r.outstanding_recovered");
        assertThat(SqlLoader.load("sql/mart/accounting/select-vision-receipt-monthly.sql"))
                .contains(":years", "\"count\"", "\"amount\"");
    }
}
