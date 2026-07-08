package com.bviit.analytics.batch.admin;

import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgeryMonthlyItem;
import com.bviit.analytics.surgery.repository.SurgeryStatsMartRepository;
import com.bviit.analytics.surgery.service.SurgeryListService;
import com.bviit.analytics.surgery.service.SurgeryStatsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 마트값 vs MSSQL 직결값 대사(reconcile). local/dev 전용 스모크.
 *
 * 기대: SurgeryMartJob이 SurgeryStatsService의 결과를 그대로 마트에 upsert하므로
 *       현재 방식에서는 diff가 0이어야 정상. diff가 나오면 배치/서비스/마트 셋 중 하나가 어긋난 것.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class SurgeryReconcileService {

    private final SurgeryStatsService statsService;      // MSSQL 직결
    private final SurgeryListService listService;         // MSSQL 직결
    private final SurgeryStatsMartRepository martRepo;    // Postgres 마트
    private final ObjectMapper objectMapper;

    public Map<String, Object> reconcileMonthly(List<Integer> years) {
        List<SurgeryMonthlyItem> source = statsService.getMonthlyStats(years);
        List<SurgeryMonthlyItem> mart = martRepo.findMonthly(years);

        Map<String, SurgeryMonthlyItem> sourceByKey = keyMonthly(source);
        Map<String, SurgeryMonthlyItem> martByKey   = keyMonthly(mart);

        List<Map<String, Object>> diffs = new ArrayList<>();
        for (String k : union(sourceByKey.keySet(), martByKey.keySet())) {
            SurgeryMonthlyItem s = sourceByKey.get(k);
            SurgeryMonthlyItem m = martByKey.get(k);
            if (s == null || m == null) {
                diffs.add(Map.of("period", k, "reason", s == null ? "missing-in-source" : "missing-in-mart"));
                continue;
            }
            Map<String, int[]> fieldDiff = diffFields(s, m);
            if (!fieldDiff.isEmpty()) diffs.add(mismatchEntry(k, fieldDiff));
        }
        return summary("monthly", source.size(), mart.size(), diffs);
    }

    public Map<String, Object> reconcileDaily(String from, String to) {
        List<SurgeryDailyItem> source = statsService.getDailyStats(from, to);
        List<SurgeryDailyItem> mart = martRepo.findDaily(from, to);

        Map<String, SurgeryDailyItem> sourceByKey = keyDaily(source);
        Map<String, SurgeryDailyItem> martByKey   = keyDaily(mart);

        List<Map<String, Object>> diffs = new ArrayList<>();
        for (String k : union(sourceByKey.keySet(), martByKey.keySet())) {
            SurgeryDailyItem s = sourceByKey.get(k);
            SurgeryDailyItem m = martByKey.get(k);
            if (s == null || m == null) {
                diffs.add(Map.of("date", k, "reason", s == null ? "missing-in-source" : "missing-in-mart"));
                continue;
            }
            Map<String, int[]> fieldDiff = diffFields(s, m);
            if (!fieldDiff.isEmpty()) diffs.add(mismatchEntry(k, fieldDiff));
        }
        return summary("daily", source.size(), mart.size(), diffs);
    }

    public Map<String, Object> reconcileList(String from, String to) {
        List<Map<String, Object>> source = listService.getSurgeryList(from, to);
        List<Map<String, Object>> mart   = martRepo.findList(from, to);

        Map<String, Long> sourceByCat = countByCategory(source);
        Map<String, Long> martByCat   = countByCategory(mart);

        LinkedHashMap<String, Object> out = new LinkedHashMap<>();
        out.put("kind", "list");
        out.put("sourceCount", source.size());
        out.put("martCount",   mart.size());
        out.put("sourceByCategory", sourceByCat);
        out.put("martByCategory",   martByCat);
        out.put("countMatches", source.size() == mart.size());
        return out;
    }

    // ─── helpers ──────────────────────────────────────────────

    private Map<String, int[]> diffFields(Object source, Object mart) {
        Map<String, Object> sMap = objectMapper.convertValue(source, Map.class);
        Map<String, Object> mMap = objectMapper.convertValue(mart, Map.class);
        Map<String, int[]> out = new LinkedHashMap<>();
        for (String key : sMap.keySet()) {
            Object sv = sMap.get(key);
            Object mv = mMap.get(key);
            // 숫자 필드만 비교. 나머지(문자열)는 스킵.
            if (sv instanceof Number s && mv instanceof Number m) {
                int si = s.intValue();
                int mi = m.intValue();
                if (si != mi) out.put(key, new int[]{si, mi, si - mi});
            }
        }
        return out;
    }

    private Map<String, Object> mismatchEntry(String key, Map<String, int[]> fieldDiff) {
        LinkedHashMap<String, Object> mismatched = new LinkedHashMap<>();
        fieldDiff.forEach((f, arr) -> mismatched.put(f, Map.of("source", arr[0], "mart", arr[1], "diff", arr[2])));
        return Map.of("key", key, "fields", mismatched);
    }

    private Map<String, Object> summary(String kind, int sourceRows, int martRows,
                                        List<Map<String, Object>> diffs) {
        LinkedHashMap<String, Object> out = new LinkedHashMap<>();
        out.put("kind", kind);
        out.put("sourceRows", sourceRows);
        out.put("martRows", martRows);
        out.put("ok", diffs.isEmpty());
        out.put("mismatchCount", diffs.size());
        out.put("mismatches", diffs);
        return out;
    }

    private static Map<String, SurgeryMonthlyItem> keyMonthly(List<SurgeryMonthlyItem> items) {
        LinkedHashMap<String, SurgeryMonthlyItem> m = new LinkedHashMap<>();
        for (SurgeryMonthlyItem i : items) m.put(i.getYear() + "-" + i.getMonth(), i);
        return m;
    }

    private static Map<String, SurgeryDailyItem> keyDaily(List<SurgeryDailyItem> items) {
        LinkedHashMap<String, SurgeryDailyItem> m = new LinkedHashMap<>();
        for (SurgeryDailyItem i : items) m.put(i.getDate(), i);
        return m;
    }

    private static List<String> union(java.util.Set<String> a, java.util.Set<String> b) {
        java.util.TreeSet<String> u = new java.util.TreeSet<>(a);
        u.addAll(b);
        return new ArrayList<>(u);
    }

    private static Map<String, Long> countByCategory(List<Map<String, Object>> rows) {
        return rows.stream().collect(
                java.util.stream.Collectors.groupingBy(
                        r -> String.valueOf(r.getOrDefault("surgeryCategory", "?")),
                        java.util.stream.Collectors.counting()
                )
        );
    }
}
