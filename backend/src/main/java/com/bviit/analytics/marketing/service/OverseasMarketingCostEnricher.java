package com.bviit.analytics.marketing.service;

import com.bviit.analytics.marketing.repository.OverseasMarketingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** 자바 BCRM 화면과 동일한 수납 분류 및 외래 내역 보정. */
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OverseasMarketingCostEnricher {

    private static final int BATCH_SIZE = 500;

    private final OverseasMarketingRepository repository;

    public void enrich(List<Map<String, Object>> rows) {
        List<String> customerNos = collectCustomerNos(rows);
        if (customerNos.isEmpty()) {
            return;
        }

        Map<String, Map<Integer, Map<String, Object>>> outpatientMap = new LinkedHashMap<>();
        Map<String, CostBucket> costMap = new LinkedHashMap<>();
        Map<String, CostBucket> fallbackMap = new LinkedHashMap<>();

        for (int from = 0; from < customerNos.size(); from += BATCH_SIZE) {
            List<String> batch = customerNos.subList(from, Math.min(from + BATCH_SIZE, customerNos.size()));
            loadOutpatientVisits(batch, outpatientMap);
            loadPriceItemCosts(batch, costMap);
            loadFallbackCosts(batch, costMap, fallbackMap);
        }

        rows.forEach(row -> merge(row, outpatientMap, costMap, fallbackMap));
    }

    private List<String> collectCustomerNos(List<Map<String, Object>> rows) {
        Set<String> values = new LinkedHashSet<>();
        for (Map<String, Object> row : rows) {
            String customerNo = stringValue(row.get("customerNo"));
            if (!customerNo.isBlank()) {
                values.add(customerNo);
            }
        }
        return new ArrayList<>(values);
    }

    private void loadOutpatientVisits(
            List<String> customerNos,
            Map<String, Map<Integer, Map<String, Object>>> target
    ) {
        for (Map<String, Object> row : repository.findOutpatientVisits(customerNos)) {
            String customerNo = stringValue(row.get("customerNo"));
            int rowNumber = ((Number) row.get("rowNumber")).intValue();
            target.computeIfAbsent(customerNo, ignored -> new LinkedHashMap<>()).put(rowNumber, row);
        }
    }

    private void loadPriceItemCosts(List<String> customerNos, Map<String, CostBucket> target) {
        for (Map<String, Object> row : repository.findPriceItemCosts(customerNos)) {
            String customerNo = stringValue(row.get("customerNo"));
            CostBucket bucket = target.computeIfAbsent(customerNo, ignored -> new CostBucket("prcitm"));
            if ("surgery".equals(row.get("category"))) {
                bucket.surgery = (Number) row.get("total");
            } else if ("exam".equals(row.get("category"))) {
                bucket.exam = (Number) row.get("total");
            }
        }
    }

    private void loadFallbackCosts(
            List<String> customerNos,
            Map<String, CostBucket> costMap,
            Map<String, CostBucket> fallbackMap
    ) {
        List<String> noPriceItems = customerNos.stream()
                .filter(customerNo -> !costMap.containsKey(customerNo))
                .toList();
        if (noPriceItems.isEmpty()) {
            return;
        }
        for (Map<String, Object> row : repository.findFallbackCosts(noPriceItems)) {
            String customerNo = stringValue(row.get("customerNo"));
            CostBucket bucket = fallbackMap.computeIfAbsent(customerNo, ignored -> new CostBucket("fallback"));
            if ("surgery".equals(row.get("category"))) {
                bucket.surgery = (Number) row.get("total");
            } else {
                bucket.exam = (Number) row.get("total");
            }
        }
    }

    private void merge(
            Map<String, Object> row,
            Map<String, Map<Integer, Map<String, Object>>> outpatientMap,
            Map<String, CostBucket> costMap,
            Map<String, CostBucket> fallbackMap
    ) {
        String customerNo = stringValue(row.get("customerNo"));
        if (customerNo.isBlank()) {
            return;
        }

        Map<Integer, Map<String, Object>> visits = outpatientMap.getOrDefault(customerNo, Map.of());
        for (int index = 1; index <= 3; index++) {
            Map<String, Object> visit = visits.get(index);
            row.put("outpatient" + index + "Date", visit == null ? "" : visit.get("visitDate"));
            row.put("outpatient" + index, visit == null ? "" : visit.get("visitMemo"));
            row.put("outpatient" + index + "Cost", visit == null ? "" : formatWon((Number) visit.get("visitCost")));
        }

        CostBucket costs = costMap.getOrDefault(
                customerNo,
                fallbackMap.getOrDefault(customerNo, new CostBucket(""))
        );
        row.put("examCost", formatWon(costs.exam));
        row.put("surgeryCost", formatWon(costs.surgery));
        row.put("costSource", costs.source);
    }

    private static String stringValue(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private static String formatWon(Number value) {
        if (value == null || value.longValue() == 0L) {
            return "";
        }
        return "₩" + NumberFormat.getIntegerInstance(Locale.US).format(value.longValue());
    }

    private static final class CostBucket {
        private Number exam;
        private Number surgery;
        private final String source;

        private CostBucket(String source) {
            this.source = source;
        }
    }
}
