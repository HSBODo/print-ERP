package com.bviit.analytics.batch.admin;

import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;
import com.bviit.analytics.outpatient.repository.OutpatientCountStatsMartRepository;
import com.bviit.analytics.outpatient.service.OutpatientCountStatsService;
import lombok.RequiredArgsConstructor;
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
 */
@Service
@Profile({"local", "dev"})
@RequiredArgsConstructor
public class OutpatientReconcileService {

    private final OutpatientCountStatsService statsService;              // 항상 활성 (MSSQL/레거시)
    private final OutpatientCountStatsMartRepository martRepo;           // Postgres 마트

    public Map<String, Object> reconcileMonthly(List<Integer> years) {
        List<OutpatientCountMonthlyItem> source = statsService.getMonthlyStats(years);
        List<OutpatientCountMonthlyItem> mart = martRepo.findMonthly(years);

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
