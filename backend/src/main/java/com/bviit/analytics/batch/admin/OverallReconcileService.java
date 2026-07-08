package com.bviit.analytics.batch.admin;

import com.bviit.analytics.overall.dto.OverallExamMonthlyItem;
import com.bviit.analytics.overall.dto.OverallExamWeeklyItem;
import com.bviit.analytics.overall.repository.OverallExamMartRepository;
import com.bviit.analytics.overall.service.OverallExamMonthlyService;
import com.bviit.analytics.overall.service.OverallExamWeeklyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 전체지표 마트값 vs MSSQL 직결값 대사. local/dev 전용.
 *
 * 주간: 키 = (yr, mo, wk). 서비스가 데이터가 있는 주만 반환하므로 마트도 동일 집합이어야 정합.
 * 월간: 키 = (yr, mo). 26년+ 만 대상(24·25는 프론트 하드코딩이라 마트에 없음).
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OverallReconcileService {

    private final OverallExamWeeklyService weeklyStatsService;        // MSSQL 직결 주간
    private final OverallExamMonthlyService monthlyStatsService;      // MSSQL 직결 월간 (주별 롤업)
    private final OverallExamMartRepository martRepo;                 // Postgres 마트
    private final ObjectMapper objectMapper;

    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    public Map<String, Object> reconcileWeekly(List<Integer> years) {
        List<OverallExamWeeklyItem> source = weeklyStatsService.getWeeklyStats(years);
        List<OverallExamWeeklyItem> mart = martRepo.findWeekly(years);

        Map<String, OverallExamWeeklyItem> sourceByKey = keyed(source);
        Map<String, OverallExamWeeklyItem> martByKey   = keyed(mart);

        List<Map<String, Object>> diffs = new ArrayList<>();
        for (String k : union(sourceByKey.keySet(), martByKey.keySet())) {
            OverallExamWeeklyItem s = sourceByKey.get(k);
            OverallExamWeeklyItem m = martByKey.get(k);
            if (s == null || m == null) {
                diffs.add(Map.of("week", k, "reason", s == null ? "missing-in-source" : "missing-in-mart"));
                continue;
            }
            Map<String, int[]> fieldDiff = diffIntFields(s, m);
            if (!fieldDiff.isEmpty()) {
                LinkedHashMap<String, Object> mismatched = new LinkedHashMap<>();
                fieldDiff.forEach((f, arr) -> mismatched.put(f,
                        Map.of("source", arr[0], "mart", arr[1], "diff", arr[2])));
                diffs.add(Map.of("week", k, "fields", mismatched));
            }
        }
        LinkedHashMap<String, Object> out = new LinkedHashMap<>();
        out.put("kind", "overall-exam-weekly");
        out.put("sourceRows", source.size());
        out.put("martRows", mart.size());
        out.put("ok", diffs.isEmpty());
        out.put("mismatchCount", diffs.size());
        out.put("mismatches", diffs);
        return out;
    }

    public Map<String, Object> reconcileMonthly(List<Integer> years) {
        // 24·25 는 마트에 시드되지 않으므로 min-year 미만 연도는 대사에서 제외
        List<Integer> targetYears = years.stream().filter(y -> y >= minYear).toList();

        List<OverallExamMonthlyItem> source = monthlyStatsService.getMonthlyStats(targetYears);
        List<OverallExamMonthlyItem> mart = martRepo.findMonthly(targetYears);

        Map<String, OverallExamMonthlyItem> sourceByKey = keyedMonthly(source);
        Map<String, OverallExamMonthlyItem> martByKey = keyedMonthly(mart);

        List<Map<String, Object>> diffs = new ArrayList<>();
        for (String k : union(sourceByKey.keySet(), martByKey.keySet())) {
            OverallExamMonthlyItem s = sourceByKey.get(k);
            OverallExamMonthlyItem m = martByKey.get(k);
            if (s == null || m == null) {
                diffs.add(Map.of("month", k, "reason", s == null ? "missing-in-source" : "missing-in-mart"));
                continue;
            }
            Map<String, int[]> fieldDiff = diffIntFields(s, m);
            if (!fieldDiff.isEmpty()) {
                LinkedHashMap<String, Object> mismatched = new LinkedHashMap<>();
                fieldDiff.forEach((f, arr) -> mismatched.put(f,
                        Map.of("source", arr[0], "mart", arr[1], "diff", arr[2])));
                diffs.add(Map.of("month", k, "fields", mismatched));
            }
        }
        LinkedHashMap<String, Object> out = new LinkedHashMap<>();
        out.put("kind", "overall-exam-monthly");
        out.put("sourceRows", source.size());
        out.put("martRows", mart.size());
        out.put("ok", diffs.isEmpty());
        out.put("mismatchCount", diffs.size());
        out.put("mismatches", diffs);
        return out;
    }

    private Map<String, int[]> diffIntFields(Object source, Object mart) {
        @SuppressWarnings("unchecked")
        Map<String, Object> sMap = objectMapper.convertValue(source, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> mMap = objectMapper.convertValue(mart, Map.class);
        Map<String, int[]> out = new LinkedHashMap<>();
        for (String key : sMap.keySet()) {
            Object sv = sMap.get(key);
            Object mv = mMap.get(key);
            if (sv instanceof Number s && mv instanceof Number m) {
                int si = s.intValue();
                int mi = m.intValue();
                if (si != mi) out.put(key, new int[]{si, mi, si - mi});
            }
        }
        return out;
    }

    private static Map<String, OverallExamWeeklyItem> keyed(List<OverallExamWeeklyItem> items) {
        LinkedHashMap<String, OverallExamWeeklyItem> m = new LinkedHashMap<>();
        for (OverallExamWeeklyItem i : items) {
            m.put(i.getYear() + "-" + i.getMonth() + "-" + i.getWeek(), i);
        }
        return m;
    }

    private static Map<String, OverallExamMonthlyItem> keyedMonthly(List<OverallExamMonthlyItem> items) {
        LinkedHashMap<String, OverallExamMonthlyItem> m = new LinkedHashMap<>();
        for (OverallExamMonthlyItem i : items) {
            m.put(String.format("%04d-%02d", i.getYear(), i.getMonth()), i);
        }
        return m;
    }

    private static List<String> union(java.util.Set<String> a, java.util.Set<String> b) {
        java.util.TreeSet<String> u = new java.util.TreeSet<>(a);
        u.addAll(b);
        return new ArrayList<>(u);
    }
}
