package com.bviit.analytics.batch.admin;

import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;
import com.bviit.analytics.outpatient.repository.OutpatientCountStatsMartRepository;
import com.bviit.analytics.outpatient.service.OutpatientCountStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * 외래수 마트값 vs MSSQL 직결값 대사. local/dev 전용.
 *
 * outpatientCount/total은 nullable — null vs null은 일치로 취급.
 *
 * min-year 미만 연도는 V9 seed SSOT — MSSQL 라이브값과 다를 수 있어 대사에서 제외한다
 * (무조건 mismatch가 되기 때문). skippedYears로 응답에 표기.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OutpatientReconcileService {

    private final OutpatientCountStatsService statsService;              // MSSQL 직결
    private final OutpatientCountStatsMartRepository martRepo;           // Postgres 마트

    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    public Map<String, Object> reconcileMonthly(List<Integer> years) {
        List<Integer> normalized = years.stream().distinct().sorted().toList();
        List<Integer> skipped = normalized.stream().filter(y -> y < minYear).toList();
        List<Integer> targets = normalized.stream().filter(y -> y >= minYear).toList();

        List<OutpatientCountMonthlyItem> source = targets.isEmpty()
                ? List.of() : statsService.getMonthlyStats(targets);
        List<OutpatientCountMonthlyItem> mart = targets.isEmpty()
                ? List.of() : martRepo.findMonthly(targets);

        Map<String, OutpatientCountMonthlyItem> sourceByKey = keyed(source);
        Map<String, OutpatientCountMonthlyItem> martByKey   = keyed(mart);

        List<Map<String, Object>> diffs = new ArrayList<>();
        for (String k : union(sourceByKey.keySet(), martByKey.keySet())) {
            OutpatientCountMonthlyItem s = sourceByKey.get(k);
            OutpatientCountMonthlyItem m = martByKey.get(k);
            if (s == null || m == null) {
                diffs.add(Map.of("period", k, "reason", s == null ? "missing-in-source" : "missing-in-mart"));
                continue;
            }
            if (!Objects.equals(s.getOutpatientCount(), m.getOutpatientCount())) {
                diffs.add(Map.of("period", k,
                        "field", "outpatientCount",
                        "source", String.valueOf(s.getOutpatientCount()),
                        "mart", String.valueOf(m.getOutpatientCount())));
            }
        }
        LinkedHashMap<String, Object> out = new LinkedHashMap<>();
        out.put("kind", "outpatient-count");
        out.put("sourceRows", source.size());
        out.put("martRows", mart.size());
        out.put("ok", diffs.isEmpty());
        out.put("mismatchCount", diffs.size());
        out.put("mismatches", diffs);
        if (!skipped.isEmpty()) {
            out.put("skippedYears", skipped);
            out.put("skippedReason",
                    "min-year(" + minYear + ") 미만은 V9 seed SSOT — MSSQL 라이브 대사 무의미");
        }
        return out;
    }

    private static Map<String, OutpatientCountMonthlyItem> keyed(List<OutpatientCountMonthlyItem> items) {
        LinkedHashMap<String, OutpatientCountMonthlyItem> m = new LinkedHashMap<>();
        for (OutpatientCountMonthlyItem i : items) m.put(i.getYear() + "-" + i.getMonth(), i);
        return m;
    }

    private static List<String> union(java.util.Set<String> a, java.util.Set<String> b) {
        java.util.TreeSet<String> u = new java.util.TreeSet<>(a);
        u.addAll(b);
        return new ArrayList<>(u);
    }
}
