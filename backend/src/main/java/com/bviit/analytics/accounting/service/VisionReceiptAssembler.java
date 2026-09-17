package com.bviit.analytics.accounting.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * 시력교정 매출 행 조립 — SOFTCRM 4개 조회(전표 상세·항목 배분·품목 폴백·수술) 를 마트 행으로 접는다.
 *
 * <p>회계 원형(디렉팅/회계/_build-crm.js) 의 규칙을 그대로 옮긴 순수 함수. 스프링 의존 없음.
 * <ul>
 *   <li>항목 금액: PrcItmDtl(결제수단별 배분) 우선. 없으면 분할이 없는 전표에 한해 PrcItmLst(수납 단위) 폴백.</li>
 *   <li>항목 합은 전표 금액과 같아야 한다(총계 불변식). 어긋나면 전표 금액에 맞춰 접는다 —
 *       합이 0 이면 전액 미분류, 그 외는 비율 보정 후 남는 원 단위를 가장 큰 항목에 붙인다.</li>
 *   <li>취소 전표(CstCnlYnN='Y') 는 원행(결제처리, +) 과 취소행(결제취소, −, 등록일시=CstModDte) 두 줄.</li>
 *   <li>수술 정보는 수납일과 가장 가까운 OPERATIONDATA 1건.</li>
 *   <li>매입사 = CstMaeNam → 없으면 CstCrdCpn 코드 환산 → 별칭(위챗페이·알리페이→나이스정보통신).</li>
 * </ul>
 */
public final class VisionReceiptAssembler {

    private static final ObjectMapper JSON = new ObjectMapper();

    private VisionReceiptAssembler() {
    }

    /** 조립 결과 — 마트 insert 파라미터 키(camelCase) 의 행 목록 + 관측 통계. */
    public record Result(List<Map<String, Object>> rows, Map<String, Integer> stats, Map<String, Integer> unknownCodes) {
    }

    public static Result assemble(List<Map<String, Object>> payments,
                                  List<Map<String, Object>> itemDetails,
                                  List<Map<String, Object>> itemFallbacks,
                                  List<Map<String, Object>> operations) {
        Map<String, List<Map<String, Object>>> detailsByPayment = groupBy(itemDetails,
                r -> key(r, "custNum", "seq", "subSeq"));
        Map<String, List<Map<String, Object>>> fallbackByReceipt = groupBy(itemFallbacks,
                r -> key(r, "custNum", "seq"));
        Map<String, List<Map<String, Object>>> operationsByCustomer = groupBy(operations,
                r -> str(r.get("custNum")));
        Map<String, Integer> splits = new HashMap<>();
        for (Map<String, Object> p : payments) {
            splits.merge(key(p, "custNum", "seq"), 1, Integer::sum);
        }

        List<Map<String, Object>> rows = new ArrayList<>(payments.size() + payments.size() / 20);
        Map<String, Integer> unknown = new TreeMap<>();
        int noItem = 0, zeroRows = 0, ratioRows = 0;

        for (Map<String, Object> p : payments) {
            String custNum = str(p.get("custNum"));
            String receiptDate = str(p.get("receiptDate"));
            long amount = num(p.get("amount"));

            List<Map<String, Object>> items = detailsByPayment.get(key(p, "custNum", "seq", "subSeq"));
            if (items == null || items.isEmpty()) {
                items = splits.getOrDefault(key(p, "custNum", "seq"), 0) == 1
                        ? fallbackByReceipt.getOrDefault(key(p, "custNum", "seq"), List.of())
                        : List.of();
            }
            if (items.isEmpty()) noItem++;

            Map<String, Long> byItem = new LinkedHashMap<>();
            for (String k : VisionItemCatalog.ITEMS) byItem.put(k, 0L);
            List<String> codes = new ArrayList<>();
            List<String> names = new ArrayList<>();
            for (Map<String, Object> it : items) {
                String code = str(it.get("itemCode"));
                String label = VisionItemCatalog.CODE_TO_ITEM.get(code);
                String labelOnly = VisionItemCatalog.CODE_LABEL_ONLY.get(code);
                if (label == null && labelOnly == null) unknown.merge(code, 1, Integer::sum);
                String bucket = label != null ? label : (labelOnly != null ? null : VisionItemCatalog.UNCLASSIFIED);
                if (bucket != null) byItem.merge(bucket, num(it.get("amount")), Long::sum);
                String shown = label != null ? label : (labelOnly != null ? labelOnly : "코드" + code);
                if (!codes.contains(shown)) codes.add(shown);
                String name = str(it.get("productName"));
                if (!name.isEmpty() && !names.contains(name)) names.add(name);
            }

            long sum = byItem.values().stream().mapToLong(Long::longValue).sum();
            if (sum != amount) {
                if (sum == 0) {
                    zeroRows++;
                    byItem.merge(VisionItemCatalog.UNCLASSIFIED, amount, Long::sum);
                } else {
                    ratioRows++;
                    scaleToAmount(byItem, sum, amount);
                }
            }

            Map<String, Object> op = nearestOperation(operationsByCustomer.get(custNum), receiptDate);
            String acquirerRaw = str(p.get("acquirerName"));
            if (acquirerRaw.isEmpty()) {
                acquirerRaw = VisionItemCatalog.ACQUIRER_CODE.getOrDefault(str(p.get("cardCode")), "");
            }
            String acquirer = VisionItemCatalog.ACQUIRER_ALIAS.getOrDefault(acquirerRaw, acquirerRaw);

            Map<String, Object> base = new LinkedHashMap<>();
            base.put("receiptDate", receiptDate);
            base.put("custNum", custNum);
            base.put("seq", (int) num(p.get("seq")));
            base.put("subSeq", (int) num(p.get("subSeq")));
            base.put("customerName", str(p.get("customerName")));
            base.put("customerGrade", str(p.get("customerGrade")));
            base.put("surgeryDate", op == null ? "" : str(op.get("operationDate")));
            base.put("surgeon", op == null ? "" : str(op.get("surgeon")));
            base.put("procedureRight", op == null ? "" : str(op.get("procedureRight")));
            base.put("procedureLeft", op == null ? "" : str(op.get("procedureLeft")));
            base.put("counselor", str(p.get("counselor")));
            base.put("paymentMethod", str(p.get("payWay")));
            base.put("cardCompany", str(p.get("cardCompany")));
            base.put("acquirer", acquirer);
            base.put("paymentMode", str(p.get("approvalNo")).isEmpty() ? "수동" : "단말기");
            base.put("category", codes.isEmpty() ? "" : codes.size() == 1 ? codes.get(0) : "다중");
            base.put("productName", names.size() == 1 ? names.get(0) : "");
            base.put("registeredBy", str(p.get("registeredBy")));
            base.put("paymentMemo", str(p.get("paymentMemo")));

            String registeredAt = str(p.get("registeredAt"));
            rows.add(signed(base, byItem, amount, 1, "결제처리", registeredAt));
            if ("Y".equals(str(p.get("cancelYn")))) {
                String modifiedAt = str(p.get("modifiedAt"));
                rows.add(signed(base, byItem, amount, -1, "결제취소", modifiedAt.isEmpty() ? registeredAt : modifiedAt));
            }
        }

        Map<String, Integer> stats = new LinkedHashMap<>();
        stats.put("payments", payments.size());
        stats.put("rows", rows.size());
        stats.put("no_item", noItem);
        stats.put("zero_item_sum", zeroRows);
        stats.put("ratio_adjusted", ratioRows);
        return new Result(rows, stats, unknown);
    }

    /** 항목 합≠전표금액 — 비율대로 눌러 담고 남는 원 단위는 절댓값이 가장 큰 항목에 붙인다. */
    private static void scaleToAmount(Map<String, Long> byItem, long sum, long amount) {
        long acc = 0;
        String biggest = null;
        for (Map.Entry<String, Long> e : byItem.entrySet()) {
            if (e.getValue() == 0) continue;
            long scaled = Math.round((double) e.getValue() * amount / sum);
            e.setValue(scaled);
            acc += scaled;
            if (biggest == null || Math.abs(scaled) > Math.abs(byItem.get(biggest))) biggest = e.getKey();
        }
        if (biggest != null && acc != amount) byItem.merge(biggest, amount - acc, Long::sum);
    }

    private static Map<String, Object> signed(Map<String, Object> base, Map<String, Long> byItem,
                                              long amount, int sign, String status, String registeredAt) {
        Map<String, Object> row = new LinkedHashMap<>(base);
        row.put("status", status);
        row.put("registeredAt", registeredAt);
        row.put("amount", sign * amount);
        Map<String, Long> signedItems = new LinkedHashMap<>();
        long taxable = 0;
        for (Map.Entry<String, Long> e : byItem.entrySet()) {
            long v = sign * e.getValue();
            signedItems.put(e.getKey(), v);
            if (VisionItemCatalog.TAX_ITEMS.contains(e.getKey())) taxable += v;
        }
        row.put("taxable", taxable);
        row.put("exempt", sign * amount - taxable);
        row.put("itemAmounts", toJson(signedItems));
        return row;
    }

    /** 수납일과 가장 가까운 수술 (날짜를 못 읽는 수술은 건너뛴다). */
    static Map<String, Object> nearestOperation(List<Map<String, Object>> operations, String receiptDate) {
        if (operations == null || operations.isEmpty()) return null;
        LocalDate base = parseDate(receiptDate);
        if (base == null) return null;
        Map<String, Object> best = null;
        long bestDistance = Long.MAX_VALUE;
        for (Map<String, Object> op : operations) {
            LocalDate d = parseDate(str(op.get("operationDate")));
            if (d == null) continue;
            long distance = Math.abs(d.toEpochDay() - base.toEpochDay());
            if (distance < bestDistance) {
                bestDistance = distance;
                best = op;
            }
        }
        return best;
    }

    private static LocalDate parseDate(String s) {
        if (s == null || s.length() < 10) return null;
        try {
            return LocalDate.parse(s.substring(0, 10));
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static String toJson(Map<String, Long> items) {
        try {
            return JSON.writeValueAsString(items);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("item_amounts json", e);
        }
    }

    private static Map<String, List<Map<String, Object>>> groupBy(List<Map<String, Object>> rows,
                                                                  java.util.function.Function<Map<String, Object>, String> keyOf) {
        Map<String, List<Map<String, Object>>> out = new HashMap<>();
        for (Map<String, Object> r : rows) out.computeIfAbsent(keyOf.apply(r), k -> new ArrayList<>()).add(r);
        return out;
    }

    private static String key(Map<String, Object> r, String... fields) {
        StringBuilder sb = new StringBuilder();
        for (String f : fields) sb.append(str(r.get(f))).append('|');
        return sb.toString();
    }

    static String str(Object v) {
        return v == null ? "" : v.toString().trim();
    }

    static long num(Object v) {
        if (v == null) return 0;
        if (v instanceof Number n) return Math.round(n.doubleValue());
        try {
            return Math.round(Double.parseDouble(v.toString().trim()));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
