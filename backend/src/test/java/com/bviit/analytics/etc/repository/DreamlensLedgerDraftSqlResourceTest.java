package com.bviit.analytics.etc.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 드림렌즈 초안 SQL(warehouse) 의 계약(별칭·필터·소스) 을 잠근다. */
class DreamlensLedgerDraftSqlResourceTest {

    @Test
    void warehouse_초안_SQL은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(DreamlensLedgerDraftRepository.DRAFT_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM raw.raw_crm_reservation r")
                .contains("JOIN raw.raw_crm_custom c")
                .contains("LEFT JOIN raw.raw_crm_medical_sub_cfg mc")
                .contains("LEFT JOIN raw.raw_crm_assignlist a")
                .contains("LEFT JOIN raw.raw_crm_employee mr")
                .contains("LEFT JOIN LATERAL")
                .contains("raw.raw_emr_paosunab")
                .contains("s.\"실수납액\"")
                .contains("s.\"수납일자\"")
                .contains("NOT IN ('a', 'A')")
                .contains("'%테스트%'")
                .doesNotContain("WITH (NOLOCK)")
                .doesNotContain("OUTER APPLY")
                .doesNotContain("ISNULL(")
                .doesNotContain("[220.85.109.240]");
    }

    @Test
    void warehouse_SQL은_ImportService_가_기대하는_별칭을_담고_있다() {
        assertThat(SqlLoader.load(DreamlensLedgerDraftRepository.DRAFT_SQL))
                .contains("entryDate").contains("customerNo").contains("customerName")
                .contains("visitTypeRaw").contains("examiner")
                .contains("lensRevenue").contains("lensListPrice").contains("treatmentRevenue");
    }
}
