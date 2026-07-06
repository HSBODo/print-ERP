package com.bviit.analytics.batch.admin;

import com.bviit.analytics.consultation.dto.CataractReservationRateItem;
import com.bviit.analytics.consultation.dto.ConsultationRateItem;
import com.bviit.analytics.consultation.dto.StopReasonMonthlyItem;
import com.bviit.analytics.consultation.repository.ConsultationStatsMartRepository;
import com.bviit.analytics.consultation.service.CataractReservationRateService;
import com.bviit.analytics.consultation.service.ConsultationRateService;
import com.bviit.analytics.consultation.service.StopReasonStatsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 전환·성공률 마트값 vs MSSQL 직결값 대사(reconcile). local/dev 전용 스모크.
 *
 * 기대: ConsultationMartJob이 서비스 결과를 그대로 upsert 하므로 diff가 0이어야 정상.
 *       diff가 나오면 배치/서비스/마트 셋 중 하나가 어긋난 것.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ConsultationReconcileService {

    private final ConsultationRateService consultationRateService;                     // MSSQL 직결
    private final StopReasonStatsService stopReasonStatsService;                        // MSSQL 직결
    private final CataractReservationRateService cataractReservationRateService;        // MSSQL 직결 (ExamRepository 경유)
    private final ConsultationStatsMartRepository martRepo;                             // Postgres 마트
    private final ObjectMapper objectMapper;

    public Map<String, Object> reconcileConsultationRate(List<Integer> years) {
        List<ConsultationRateItem> source = consultationRateService.getMonthlyRates(years);
        List<ConsultationRateItem> mart = martRepo.findConsultationRateMonthly(years);
        return reconcileMonthly("consultation-rate", source, mart,
                i -> i.getYear() + "-" + i.getMonth());
    }

    public Map<String, Object> reconcileStopReason(List<Integer> years) {
        List<StopReasonMonthlyItem> source = stopReasonStatsService.getMonthlyStats(years);
        List<StopReasonMonthlyItem> mart = martRepo.findStopReasonMonthly(years);
        return reconcileMonthly("stop-reason", source, mart,
                i -> i.getYear() + "-" + i.getMonth());
    }

    public Map<String, Object> reconcileReservationRate(List<Integer> years, String category) {
        String normalizedCategory = "vision".equalsIgnoreCase(category) ? "vision" : "cataract";
        List<CataractReservationRateItem> source =
                cataractReservationRateService.getMonthlyRates(years, normalizedCategory);
        List<CataractReservationRateItem> mart =
                martRepo.findReservationRateMonthly(years, normalizedCategory);
        Map<String, Object> result = reconcileMonthly("reservation-rate", source, mart,
                i -> i.getYear() + "-" + i.getMonth());
        result.put("category", normalizedCategory);
        return result;
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
            Map<String, double[]> fieldDiff = diffNumericFields(s, m);
            if (!fieldDiff.isEmpty()) diffs.add(mismatchEntry(k, fieldDiff));
        }
        return summary(kind, source.size(), mart.size(), diffs);
    }

    /** 숫자(int/double) 필드 차이를 double[]로 담아 반환 — rate는 소수 1자리라 double 비교. */
    private Map<String, double[]> diffNumericFields(Object source, Object mart) {
        @SuppressWarnings("unchecked")
        Map<String, Object> sMap = objectMapper.convertValue(source, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> mMap = objectMapper.convertValue(mart, Map.class);
        Map<String, double[]> out = new LinkedHashMap<>();
        for (String key : sMap.keySet()) {
            Object sv = sMap.get(key);
            Object mv = mMap.get(key);
            if (sv instanceof Number s && mv instanceof Number m) {
                double sd = s.doubleValue();
                double md = m.doubleValue();
                if (Math.abs(sd - md) > 1e-9) out.put(key, new double[]{sd, md, sd - md});
            }
        }
        return out;
    }

    private Map<String, Object> mismatchEntry(String key, Map<String, double[]> fieldDiff) {
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
}
