package com.bviit.analytics.accounting.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class VisionReceiptSqlResourcesTest {

    @Test
    void warehouse_vision_payments_sql은_Postgres_방언과_raw_스키마를_사용한다() {
        String sql = SqlLoader.load(VisionReceiptSourceRepository.PAYMENTS_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM raw.raw_crm_cstprcsub s")
                .contains("LEFT JOIN raw.raw_crm_costprice c")
                .contains("LEFT JOIN raw.raw_crm_custom   cu")
                .contains("LEFT JOIN raw.raw_crm_employee e")
                .contains("TO_CHAR(s.cstregdte, 'YYYY-MM-DD HH24:MI:SS')")
                .contains("COALESCE(cu.level, '')")
                .contains("s.cstdte >= :from AND s.cstdte <= :to")
                .contains("AS \"custNum\"")
                .contains("AS \"receiptDate\"")
                .contains("AS \"registeredAt\"");
    }

    @Test
    void warehouse_vision_item_details_sql은_prcitmdtl_raw_참조() {
        String sql = SqlLoader.load(VisionReceiptSourceRepository.ITEM_DETAILS_SQL);

        assertThat(sql)
                .contains("FROM raw.raw_crm_prcitmdtl d")
                .contains("FROM raw.raw_crm_cstprcsub s")
                .contains("s.cstcusnum = d.prccusnum AND s.cstseq = d.prcseq")
                .contains("AS \"custNum\"")
                .contains("AS \"itemCode\"");
    }

    @Test
    void warehouse_vision_items_sql은_prcitmlst_raw_참조() {
        String sql = SqlLoader.load(VisionReceiptSourceRepository.ITEMS_SQL);

        assertThat(sql)
                .contains("FROM raw.raw_crm_prcitmlst p")
                .contains("p.prcitmqty * p.prcitmprc")
                .contains("AS \"amount\"");
    }

    @Test
    void warehouse_vision_operations_sql은_operationdata_raw_참조() {
        String sql = SqlLoader.load(VisionReceiptSourceRepository.OPERATIONS_SQL);

        assertThat(sql)
                .contains("FROM raw.raw_crm_operationdata o")
                .contains("LEFT JOIN raw.raw_crm_employee d ON d.emp_num = o.operation_doc")
                .contains("s.cstcusnum = o.cust_num")
                .contains("AS \"operationDate\"")
                .contains("AS \"surgeon\"");
    }
}
