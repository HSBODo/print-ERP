package com.bviit.analytics.accounting.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 회계 원형(_build-crm.js · _smoke-test.js) 이 보장하던 불변식을 Java 조립기에서도 잠근다:
 * 항목합 ≡ 수납금액, 취소 전표는 원행+취소행(음수), 과세는 건기식 계열만, 매입사 코드 환산·별칭.
 */
class VisionReceiptAssemblerTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    private static Map<String, Object> payment(String cust, int seq, int sub, long amount, String cancel) {
        Map<String, Object> p = new HashMap<>();
        p.put("custNum", cust); p.put("seq", seq); p.put("subSeq", sub);
        p.put("receiptDate", "2026-07-01"); p.put("amount", amount);
        p.put("payWay", "카드"); p.put("acquirerName", ""); p.put("cardCode", "07 "); p.put("approvalNo", "");
        p.put("cancelYn", cancel);
        p.put("registeredAt", "2026-07-01 11:45:29"); p.put("modifiedAt", "2026-07-01 12:33:56");
        p.put("registeredBy", "장유선"); p.put("cardCompany", "신한"); p.put("paymentMemo", "");
        p.put("customerName", "홍길동"); p.put("customerGrade", "R"); p.put("counselor", "김상담");
        return p;
    }

    private static Map<String, Object> detail(String cust, int seq, int sub, String code, String product, long amount) {
        return Map.of("custNum", cust, "seq", seq, "subSeq", sub, "itemCode", code, "productName", product, "amount", amount);
    }

    private static Map<String, Long> items(Map<String, Object> row) throws Exception {
        return JSON.readValue((String) row.get("itemAmounts"), new TypeReference<Map<String, Long>>() { });
    }

    @Test
    void 항목_배분이_있으면_진료명으로_환산하고_항목합은_수납금액과_같다() throws Exception {
        var result = VisionReceiptAssembler.assemble(
                List.of(payment("C1", 1, 1, 3_850_000, "")),
                List.of(detail("C1", 1, 1, "O", "SMILE PRO", 3_500_000), detail("C1", 1, 1, "D", "DNA", 350_000)),
                List.of(), List.of());

        assertThat(result.rows()).hasSize(1);
        Map<String, Object> row = result.rows().get(0);
        assertThat(row.get("status")).isEqualTo("결제처리");
        assertThat(row.get("category")).isEqualTo("다중");
        assertThat(row.get("acquirer")).isEqualTo("신한");        // 코드 '07 ' → 신한 (trim 후 환산)
        assertThat(row.get("paymentMode")).isEqualTo("수동");     // 승인번호 없음
        Map<String, Long> items = items(row);
        assertThat(items).containsEntry("수술", 3_500_000L).containsEntry("DNA", 350_000L);
        assertThat(items.values().stream().mapToLong(Long::longValue).sum()).isEqualTo(3_850_000L);
        assertThat(items).containsKeys(VisionItemCatalog.ITEMS.toArray(String[]::new));
        assertThat(row.get("taxable")).isEqualTo(0L);
        assertThat(row.get("exempt")).isEqualTo(3_850_000L);
    }

    @Test
    void 취소_전표는_원행과_음수_취소행_두_줄이_되고_취소행_등록일시는_수정일시다() throws Exception {
        var result = VisionReceiptAssembler.assemble(
                List.of(payment("C1", 3, 1, 50_000, "Y")),
                List.of(detail("C1", 3, 1, "35", "올코드라이아이", 50_000)),
                List.of(), List.of());

        assertThat(result.rows()).hasSize(2);
        Map<String, Object> original = result.rows().get(0);
        Map<String, Object> cancel = result.rows().get(1);
        assertThat(original.get("amount")).isEqualTo(50_000L);
        assertThat(original.get("taxable")).isEqualTo(50_000L);          // 건기식 = 과세
        assertThat(cancel.get("status")).isEqualTo("결제취소");
        assertThat(cancel.get("amount")).isEqualTo(-50_000L);
        assertThat(cancel.get("taxable")).isEqualTo(-50_000L);
        assertThat(cancel.get("registeredAt")).isEqualTo("2026-07-01 12:33:56");
        assertThat(items(cancel)).containsEntry("올코드라이아이", -50_000L);
    }

    @Test
    void 배분이_없고_분할이_아니면_수납단위_품목으로_폴백하고_합이_어긋나면_비율_보정한다() throws Exception {
        var result = VisionReceiptAssembler.assemble(
                List.of(payment("C2", 1, 1, 1_000_000, "")),
                List.of(),
                List.of(detail("C2", 1, 0, "O", "LASEK", 900_000), detail("C2", 1, 0, "33", "검사", 300_000)),
                List.of());

        Map<String, Long> items = items(result.rows().get(0));
        assertThat(items.get("수술") + items.get("검사비")).isEqualTo(1_000_000L);   // 정가 합 120만 → 전표 100만에 맞춤
        assertThat(items.get("수술")).isEqualTo(750_000L);
        assertThat(result.stats()).containsEntry("ratio_adjusted", 1);
    }

    @Test
    void 품목_정보가_없으면_전액_미분류로_두고_모르는_코드는_보고한다() throws Exception {
        var result = VisionReceiptAssembler.assemble(
                List.of(payment("C3", 1, 1, 70_000, ""), payment("C4", 1, 1, 10_000, "")),
                List.of(detail("C4", 1, 1, "ZZ", "??", 10_000)),
                List.of(), List.of());

        assertThat(items(result.rows().get(0))).containsEntry("미분류", 70_000L);
        assertThat(items(result.rows().get(1))).containsEntry("미분류", 10_000L);
        assertThat(result.rows().get(1).get("category")).isEqualTo("코드ZZ");
        assertThat(result.unknownCodes()).containsEntry("ZZ", 1);
        assertThat(result.stats()).containsEntry("no_item", 1).containsEntry("zero_item_sum", 1);
    }

    @Test
    void 수납일과_가장_가까운_수술을_붙이고_매입사_별칭을_적용한다() {
        Map<String, Object> p = payment("C5", 1, 1, 100_000, "");
        p.put("acquirerName", "알리페이");
        var result = VisionReceiptAssembler.assemble(
                List.of(p),
                List.of(detail("C5", 1, 1, "O", "ICL", 100_000)),
                List.of(),
                List.of(Map.of("custNum", "C5", "operationDate", "2026-06-01", "procedureRight", "ICL", "procedureLeft", "", "surgeon", "김원장"),
                        Map.of("custNum", "C5", "operationDate", "2026-07-03", "procedureRight", "LASEK", "procedureLeft", "LASEK", "surgeon", "박원장"),
                        Map.of("custNum", "C5", "operationDate", "", "procedureRight", "X", "procedureLeft", "X", "surgeon", "무시")));

        Map<String, Object> row = result.rows().get(0);
        assertThat(row.get("surgeryDate")).isEqualTo("2026-07-03");
        assertThat(row.get("surgeon")).isEqualTo("박원장");
        assertThat(row.get("acquirer")).isEqualTo("나이스정보통신");
        assertThat(row.get("productName")).isEqualTo("ICL");
        assertThat(row.get("category")).isEqualTo("수술");
    }
}
