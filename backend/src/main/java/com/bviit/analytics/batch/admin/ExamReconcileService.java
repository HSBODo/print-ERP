package com.bviit.analytics.batch.admin;

import com.bviit.analytics.exam.dto.ExaminationMonthlyItem;
import com.bviit.analytics.exam.dto.ProcedureExamMonthlyItem;
import com.bviit.analytics.exam.repository.ExamStatsMartRepository;
import com.bviit.analytics.exam.service.CataractExamListService;
import com.bviit.analytics.exam.service.ExamListService;
import com.bviit.analytics.exam.service.ExaminationStatsService;
import com.bviit.analytics.exam.service.ProcedureExamStatsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 검사 마트값 vs MSSQL 직결값 대사(reconcile). local/dev 전용 스모크.
 *
 * 기대: ExamMartJob이 각 서비스의 결과를 그대로 마트에 upsert하므로 diff가 0이어야 정상.
 *       diff가 나오면 배치/서비스/마트 셋 중 하나가 어긋난 것.
 */
@Service
@Profile({"local", "dev"})
@RequiredArgsConstructor
public class ExamReconcileService {

    private final ExaminationStatsService examinationStatsService;       // MSSQL 직결
    private final ProcedureExamStatsService procedureExamStatsService;   // MSSQL 직결
    private final ExamListService examListService;                        // MSSQL 직결
    private final CataractExamListService cataractExamListService;        // MSSQL 직결
    private final ExamStatsMartRepository martRepo;                       // Postgres 마트
    private final ObjectMapper objectMapper;

    public Map<String, Object> reconcileExamination(List<Integer> years) {
        List<ExaminationMonthlyItem> source = examinationStatsService.getMonthlyStats(years);
        List<ExaminationMonthlyItem> mart = martRepo.findExaminationMonthly(years);
        return reconcileMonthly("examination", source, mart,
                i -> i.getYear() + "-" + i.getMonth());
    }

    public Map<String, Object> reconcileProcedureExam(List<Integer> years) {
        List<ProcedureExamMonthlyItem> source = procedureExamStatsService.getMonthlyStats(years);
        List<ProcedureExamMonthlyItem> mart = martRepo.findProcedureExamMonthly(years);
        return reconcileMonthly("procedure-exam", source, mart,
                i -> i.getYear() + "-" + i.getMonth());
    }

    public Map<String, Object> reconcileExamList(String from, String to) {
        List<Map<String, Object>> source = examListService.getExamList(from, to);
        List<Map<String, Object>> mart   = martRepo.findExamList(from, to);
        return reconcileList("exam-list", source, mart);
    }

    public Map<String, Object> reconcileCataractExamList(String from, String to) {
        List<Map<String, Object>> source = cataractExamListService.getCataractExamList(from, to);
        List<Map<String, Object>> mart   = martRepo.findCataractExamList(from, to);
        return reconcileList("cataract-exam-list", source, mart);
    }

    // ─── helpers ──────────────────────────────────────────────

    private <T> Map<String, Object> reconcileMonthly(String kind, List<T> source, List<T> mart,
                                                     java.util.function.Function<T, String> keyFn) {
        Map<String, T> sourceByKey = keyed(source, keyFn);
        Map<String, T> martByKey   = keyed(mart, keyFn);

        List<Map<String, Object>> diffs = new ArrayList<>();
        for (String k : union(sourceByKey.keySet(), martByKey.keySet())) {
            T s = sourceByKey.get(k);
            T m = martByKey.get(k);
            if (s == null || m == null) {
                diffs.add(Map.of("period", k, "reason", s == null ? "missing-in-source" : "missing-in-mart"));
                continue;
            }
            Map<String, int[]> fieldDiff = diffFields(s, m);
            if (!fieldDiff.isEmpty()) diffs.add(mismatchEntry(k, fieldDiff));
        }
        return summary(kind, source.size(), mart.size(), diffs);
    }

    private Map<String, Object> reconcileList(String kind,
                                              List<Map<String, Object>> source,
                                              List<Map<String, Object>> mart) {
        Map<String, Long> sourceByCategory = countByExamCategory(source);
        Map<String, Long> martByCategory   = countByExamCategory(mart);

        LinkedHashMap<String, Object> out = new LinkedHashMap<>();
        out.put("kind", kind);
        out.put("sourceCount", source.size());
        out.put("martCount",   mart.size());
        out.put("sourceByExamCategory", sourceByCategory);
        out.put("martByExamCategory",   martByCategory);
        out.put("countMatches", source.size() == mart.size());
        return out;
    }

    private Map<String, int[]> diffFields(Object source, Object mart) {
        @SuppressWarnings("unchecked")
        Map<String, Object> sMap = objectMapper.convertValue(source, Map.class);
        @SuppressWarnings("unchecked")
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

    private static <T> Map<String, T> keyed(List<T> items, java.util.function.Function<T, String> keyFn) {
        LinkedHashMap<String, T> m = new LinkedHashMap<>();
        for (T i : items) m.put(keyFn.apply(i), i);
        return m;
    }

    private static List<String> union(java.util.Set<String> a, java.util.Set<String> b) {
        java.util.TreeSet<String> u = new java.util.TreeSet<>(a);
        u.addAll(b);
        return new ArrayList<>(u);
    }

    private static Map<String, Long> countByExamCategory(List<Map<String, Object>> rows) {
        return rows.stream().collect(
                java.util.stream.Collectors.groupingBy(
                        r -> String.valueOf(r.getOrDefault("examCategory", "?")),
                        java.util.stream.Collectors.counting()
                )
        );
    }
}
