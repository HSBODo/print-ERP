package com.bviit.analytics.accounting.service;

import com.bviit.analytics.accounting.dto.MedicalMonthlyItem;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * 의사랑 월합 조각(src = out/in/pt/pt80/gs · ym · cnt · v1~v5) 을 (연, 월) 한 행으로 접는다.
 * 회계 원형 _build-monthly.js 의 병합 로직. 순수 함수.
 */
public final class MedicalMonthlyFolder {

    private MedicalMonthlyFolder() {
    }

    private static final class Acc {
        int count;
        long copayDue, claim, salary, nonCovered, discount;
        long outstandingRecovered, refund, outstandingNew, refundOccurred, healthLiving;
    }

    public static List<MedicalMonthlyItem> fold(List<Map<String, Object>> parts) {
        Map<String, Acc> byMonth = new TreeMap<>();
        for (Map<String, Object> r : parts) {
            String ym = VisionReceiptAssembler.str(r.get("ym"));
            if (ym.length() < 7) continue;
            Acc a = byMonth.computeIfAbsent(ym, k -> new Acc());
            long v1 = VisionReceiptAssembler.num(r.get("v1"));
            long v2 = VisionReceiptAssembler.num(r.get("v2"));
            long v3 = VisionReceiptAssembler.num(r.get("v3"));
            switch (VisionReceiptAssembler.str(r.get("src"))) {
                case "out", "in" -> {
                    a.count += (int) VisionReceiptAssembler.num(r.get("cnt"));
                    a.copayDue += v1;
                    a.claim += v2;
                    a.salary += v3;
                    a.nonCovered += VisionReceiptAssembler.num(r.get("v4"));
                    a.discount += VisionReceiptAssembler.num(r.get("v5"));
                }
                case "pt" -> {
                    a.outstandingRecovered += v1;
                    a.refund += v2;
                    a.outstandingNew += v3;
                }
                case "pt80" -> a.refundOccurred += v1;
                case "gs" -> a.healthLiving += v1;
                default -> { }
            }
        }
        List<MedicalMonthlyItem> out = new ArrayList<>(byMonth.size());
        for (Map.Entry<String, Acc> e : byMonth.entrySet()) {
            Acc a = e.getValue();
            out.add(new MedicalMonthlyItem(
                    Integer.parseInt(e.getKey().substring(0, 4)), Integer.parseInt(e.getKey().substring(5, 7)),
                    a.count, a.copayDue, a.claim, a.salary, a.nonCovered, a.discount,
                    a.outstandingRecovered, a.refund, a.outstandingNew, a.refundOccurred, a.healthLiving));
        }
        return out;
    }
}
