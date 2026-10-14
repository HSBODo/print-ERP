package com.bviit.analytics.etc.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 드림렌즈 초안 SQL 두 방언의 계약(별칭·필터·소스) 을 잠근다. Phase 2 이관 (2026-09-30). */
class DreamlensLedgerDraftSqlResourceTest {

    @Test
    void mssql_초안_SQL은_링크드서버_경로와_MSSQL_방언을_유지한다() {
        String sql = SqlLoader.load(DreamlensLedgerDraftRepository.DRAFT_MSSQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM RESERVATION r WITH (NOLOCK)")
                .contains("JOIN CUSTOM c WITH (NOLOCK)")
                .contains("LEFT JOIN MEDICAL_SUB_CFG mc")
                .contains("LEFT JOIN AssignList a WITH (NOLOCK)")
                .contains("LEFT JOIN EMPLOYEE mr WITH (NOLOCK)")
                .contains("OUTER APPLY")
                .contains("[220.85.109.240].IPLUS.dbo.PAOSUNAB")
                .contains("s.실수납액")
                .contains("s.수납일자")
                .contains("NOT IN ('a', 'A')")            // CS 컬레이션 이중 필터
                .contains("N'%테스트%'");
    }

    @Test
    void warehouse_초안_SQL은_raw_스키마와_Postgres_방언을_사용한다() {
        String sql = SqlLoader.load(DreamlensLedgerDraftRepository.DRAFT_WAREHOUSE);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM raw.raw_crm_reservation r")
                .contains("JOIN raw.raw_crm_custom c")
                .contains("LEFT JOIN raw.raw_crm_medical_sub_cfg mc")
                .contains("LEFT JOIN raw.raw_crm_assignlist a")
                .contains("LEFT JOIN raw.raw_crm_employee mr")
                .contains("LEFT JOIN LATERAL")            // OUTER APPLY 대체
                .contains("raw.raw_emr_paosunab")         // 링크드서버 제거
                .contains("s.\"실수납액\"")               // 한글 컬럼 쌍따옴표
                .contains("s.\"수납일자\"")
                .contains("NOT IN ('a', 'A')")            // CS 이슈 대비 이중 필터 유지
                .contains("'%테스트%'")                    // Postgres 는 N 접두어 없음
                .doesNotContain("WITH (NOLOCK)")
                .doesNotContain("OUTER APPLY")
                .doesNotContain("ISNULL(")
                .doesNotContain("[220.85.109.240]");
    }

    @Test
    void 두_방언_모두_ImportService_가_기대하는_별칭을_담고_있다() {
        for (String location : new String[]{DreamlensLedgerDraftRepository.DRAFT_MSSQL,
                                            DreamlensLedgerDraftRepository.DRAFT_WAREHOUSE}) {
            assertThat(SqlLoader.load(location)).as(location)
                    .contains("entryDate").contains("customerNo").contains("customerName")
                    .contains("visitTypeRaw").contains("examiner")
                    .contains("lensRevenue").contains("lensListPrice").contains("treatmentRevenue");
        }
    }
}
