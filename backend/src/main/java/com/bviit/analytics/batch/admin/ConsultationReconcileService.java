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
 * ⚠️ diff 0 아님 — 정의가 갈렸다(2026-08-12 하이브리드 이관 이후).
 *   배치는 이제 list_exam / v_all_exam_list(= select-exam-list.sql 4개 필터 적용된 population)을
 *   기반으로 계산하고, 소스인 이 raw MSSQL 서비스는 EXAM/RESERVATION 직결이라 그 필터가 없다.
 *
 *   예상되는 정상 diff:
 *     · reservation-rate(cataract) : mart 가 월 20~30명 적음 (미내원 STATE='Y' 제외 때문).
 *     · stop-reason                : mart 가 월 최대 4건 적음 (테스트·pure cataract empty·
 *                                    순수 외래 유입·백내장 중복 4개 필터가 이미 걸린 population).
 *     · consultation-rate          : 같은 population 차이로 소폭 diff.
 *
 *   이 diff 는 리스트 정의가 화면과 정확히 정합하도록 하는 설계상 정상 상태이지 버그가 아니다.
 *   원본 raw MSSQL 정의는 대사(reconcile) 참조용으로만 유지한다 —
 *   raw 소스와 새 정의의 gap 이 갑자기 커지는지 감시하는 용도.
 *
 *   버그를 의심해야 할 신호:
 *     · 위 예상 범위를 크게 벗어난 diff (예: 월 100+ 명, stop-reason 월 20+ 건)
 *     · diff 방향이 반대 (mart 가 원본보다 큼)
 *     · missing-in-mart / missing-in-source 가 새 월에서 튐
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
