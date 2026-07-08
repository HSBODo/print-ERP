package com.bviit.analytics.batch.admin;

import com.bviit.analytics.etc.dto.B2bRevenueMonthlyItem;
import com.bviit.analytics.etc.repository.B2bRevenueStatsMartRepository;
import com.bviit.analytics.etc.service.B2bRevenueStatsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 기타 도메인 마트값 vs MSSQL 직결값 대사. local/dev 전용.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class EtcReconcileService {

    private final B2bRevenueStatsService b2bRevenueStatsService;         // MSSQL 직결
    private final B2bRevenueStatsMartRepository martRepo;                 // Postgres 마트
    private final ObjectMapper objectMapper;

    public Map<String, Object> reconcileB2bRevenue(List<Integer> years) {
        List<B2bRevenueMonthlyItem> source = b2bRevenueStatsService.getMonthlyRevenue(years);
        List<B2bRevenueMonthlyItem> mart = martRepo.findMonthly(years);

        Map<String, B2bRevenueMonthlyItem> sourceByKey = keyed(source);
        Map<String, B2bRevenueMonthlyItem> martByKey = keyed(mart);

        List<Map<String, Object>> diffs = new ArrayList<>();
        for (String k : union(sourceByKey.keySet(), martByKey.keySet())) {
            B2bRevenueMonthlyItem s = sourceByKey.get(k);
            B2bRevenueMonthlyItem m = martByKey.get(k);
            if (s == null || m == null) {
                diffs.add(Map.of("period", k, "reason", s == null ? "missing-in-source" : "missing-in-mart"));
                continue;
            }
            Map<String, long[]> fieldDiff = diffIntFields(s, m);
            if (!fieldDiff.isEmpty()) {
                LinkedHashMap<String, Object> mismatched = new LinkedHashMap<>();
                fieldDiff.forEach((f, arr) -> mismatched.put(f,
                        Map.of("source", arr[0], "mart", arr[1], "diff", arr[2])));
                diffs.add(Map.of("period", k, "fields", mismatched));
            }
        }
        LinkedHashMap<String, Object> out = new LinkedHashMap<>();
        out.put("kind", "b2b-revenue");
        out.put("sourceRows", source.size());
        out.put("martRows", mart.size());
        out.put("ok", diffs.isEmpty());
        out.put("mismatchCount", diffs.size());
        out.put("mismatches", diffs);
        return out;
    }

    /** 매출은 int 상한을 넘길 수 있어 long으로 비교(원 단위 총액). */
    private Map<String, long[]> diffIntFields(Object source, Object mart) {
        @SuppressWarnings("unchecked")
        Map<String, Object> sMap = objectMapper.convertValue(source, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> mMap = objectMapper.convertValue(mart, Map.class);
        Map<String, long[]> out = new LinkedHashMap<>();
        for (String key : sMap.keySet()) {
            Object sv = sMap.get(key);
            Object mv = mMap.get(key);
            if (sv instanceof Number s && mv instanceof Number m) {
                long sl = s.longValue();
                long ml = m.longValue();
                if (sl != ml) out.put(key, new long[]{sl, ml, sl - ml});
            }
        }
        return out;
    }

    private static Map<String, B2bRevenueMonthlyItem> keyed(List<B2bRevenueMonthlyItem> items) {
        LinkedHashMap<String, B2bRevenueMonthlyItem> m = new LinkedHashMap<>();
        for (B2bRevenueMonthlyItem i : items) m.put(i.getYear() + "-" + i.getMonth(), i);
        return m;
    }

    private static List<String> union(java.util.Set<String> a, java.util.Set<String> b) {
        java.util.TreeSet<String> u = new java.util.TreeSet<>(a);
        u.addAll(b);
        return new ArrayList<>(u);
    }
}
