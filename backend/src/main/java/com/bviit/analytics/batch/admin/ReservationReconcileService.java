package com.bviit.analytics.batch.admin;

import com.bviit.analytics.reservation.dto.ReservationListResult;
import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import com.bviit.analytics.reservation.repository.ReservationListRepository;
import com.bviit.analytics.reservation.repository.ReservationOverallMartRepository;
import com.bviit.analytics.reservation.repository.ReservationStatsMartRepository;
import com.bviit.analytics.reservation.service.ReservationListService;
import com.bviit.analytics.reservation.service.ReservationOverallStatsService;
import com.bviit.analytics.reservation.service.ReservationStatsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

/**
 * 예약 마트값 vs MSSQL 직결값 대사(reconcile). local/dev 전용 스모크.
 *
 * 대사 대상별 기대값이 다르다 — 소스와 마트가 같은 정의를 쓰는지에 따라 갈린다.
 *
 * 1) reconcileMonthly (수술/외래/드림렌즈)
 *      마트: list_reservation_all 을 월로 접음 (V53).
 *      소스: monthly-by-type.sql (raw RESERVATION SUM).
 *      필터 동일 (RESERVE_STATE<>'C' + FLAG='O'/'D'/JINRYO='2') → **diff 0 기대**.
 *
 * 2) reconcileOverallMonthly (예약 종합·콜·온라인)
 *      마트: ReservationOverallMartQueryService (@Primary, 컷오버 이후 시력교정·백내장 채널 마트 + 홈페이지 마트 SUM).
 *      소스: ReservationOverallStatsService (MSSQL 직결).
 *      2026-06+ 계산식이 다르다 — mart 는 화면과 정합, 소스는 raw MSSQL. **소폭 diff 정상**.
 *      2024·2025 는 V12 seed 고정이라 min-year 필터로 대사에서 제외.
 *
 * 3) reconcileList / reconcileKakao
 *      마트가 소스 결과를 그대로 저장 → **diff 0 기대**.
 *
 * 버그 의심 신호:
 *   · monthly / list / kakao 에서 diff 발생 (정의 동일이라 나오면 안 됨).
 *   · overallMonthly 에서 diff 방향이 뒤집힘 (mart 가 소스보다 훨씬 큼).
 *   · missing-in-mart / missing-in-source 가 새 월에서 튐.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationReconcileService {

    private final ReservationStatsService statsService;              // MSSQL 직결
    private final ReservationOverallStatsService overallStatsService; // MSSQL 직결 (예약 종합/콜/온라인)
    private final ReservationListService listService;                 // MSSQL 직결
    private final ReservationListRepository listRepository;           // MSSQL 직결 (kakao daily)
    private final ReservationStatsMartRepository martRepo;            // Postgres 마트
    private final ReservationOverallMartRepository overallMartRepo;   // Postgres 마트 (예약 종합)
    private final ObjectMapper objectMapper;

    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    public Map<String, Object> reconcileMonthly(List<Integer> years) {
        List<ReservationMonthlyItem> source = statsService.getMonthlyStats(years);
        List<ReservationMonthlyItem> mart = martRepo.findMonthly(years);

        Map<String, ReservationMonthlyItem> sourceByKey = keyMonthly(source);
        Map<String, ReservationMonthlyItem> martByKey   = keyMonthly(mart);

        List<Map<String, Object>> diffs = new ArrayList<>();
        for (String k : union(sourceByKey.keySet(), martByKey.keySet())) {
            ReservationMonthlyItem s = sourceByKey.get(k);
            ReservationMonthlyItem m = martByKey.get(k);
            if (s == null || m == null) {
                diffs.add(Map.of("period", k, "reason", s == null ? "missing-in-source" : "missing-in-mart"));
                continue;
            }
            Map<String, int[]> fieldDiff = diffFields(s, m);
            if (!fieldDiff.isEmpty()) diffs.add(mismatchEntry(k, fieldDiff));
        }
        return summary("monthly", source.size(), mart.size(), diffs);
    }

    /**
     * 예약 종합(콜·온라인) 월별 대사 — mart_reservation_overall_monthly vs MSSQL 직결값.
     * 24·25 는 V12 seed 값으로 고정되고 MSSQL 라이브값과 다를 수 있어 min-year 이상만 비교.
     */
    public Map<String, Object> reconcileOverallMonthly(List<Integer> years) {
        List<Integer> targetYears = years.stream().filter(y -> y >= minYear).toList();

        List<ReservationOverallMonthlyItem> source = overallStatsService.getMonthlyStats(targetYears);
        List<ReservationOverallMonthlyItem> mart = overallMartRepo.findMonthly(targetYears);

        Map<String, ReservationOverallMonthlyItem> sourceByKey = keyOverall(source);
        Map<String, ReservationOverallMonthlyItem> martByKey   = keyOverall(mart);

        List<Map<String, Object>> diffs = new ArrayList<>();
        for (String k : union(sourceByKey.keySet(), martByKey.keySet())) {
            ReservationOverallMonthlyItem s = sourceByKey.get(k);
            ReservationOverallMonthlyItem m = martByKey.get(k);
            if (s == null || m == null) {
                diffs.add(Map.of("period", k, "reason", s == null ? "missing-in-source" : "missing-in-mart"));
                continue;
            }
            Map<String, Integer[]> fieldDiff = diffNullableFields(s, m);
            if (!fieldDiff.isEmpty()) diffs.add(mismatchEntryNullable(k, fieldDiff));
        }
        return summary("overall-monthly", source.size(), mart.size(), diffs);
    }

    public Map<String, Object> reconcileList(String from, String to) {
        ReservationListResult sourceResult = listService.getReservationList(from, to);
        List<Map<String, Object>> source = sourceResult.rows();
        List<Map<String, Object>> mart   = martRepo.findList(from, to);

        Map<String, Long> sourceByChannel = countByChannelGroup(source);
        Map<String, Long> martByChannel   = countByChannelGroup(mart);

        LinkedHashMap<String, Object> out = new LinkedHashMap<>();
        out.put("kind", "list");
        out.put("sourceCount", source.size());
        out.put("martCount",   mart.size());
        out.put("sourceByChannelGroup", sourceByChannel);
        out.put("martByChannelGroup",   martByChannel);
        out.put("countMatches", source.size() == mart.size());
        return out;
    }

    /**
     * 카카오 일별 건수 대사 — MSSQL 원본(HappyTalk) vs 마트(mart_reservation_kakao_daily)의 SUM 비교.
     */
    public Map<String, Object> reconcileKakao(String from, String to) {
        List<Map<String, Object>> sourceDaily = listRepository.findKakaoDailyCounts(from, to);
        int sourceSum = sourceDaily.stream().mapToInt(r -> toInt(r.get("kakaoCount"))).sum();
        int martSum = martRepo.findKakaoCount(from, to);

        LinkedHashMap<String, Object> out = new LinkedHashMap<>();
        out.put("kind", "kakao");
        out.put("sourceDays", sourceDaily.size());
        out.put("sourceSum", sourceSum);
        out.put("martSum", martSum);
        out.put("diff", sourceSum - martSum);
        out.put("ok", sourceSum == martSum);
        return out;
    }

    // ─── helpers ──────────────────────────────────────────────

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

    private static Map<String, ReservationMonthlyItem> keyMonthly(List<ReservationMonthlyItem> items) {
        LinkedHashMap<String, ReservationMonthlyItem> m = new LinkedHashMap<>();
        for (ReservationMonthlyItem i : items) m.put(i.getYear() + "-" + i.getMonth(), i);
        return m;
    }

    private static Map<String, ReservationOverallMonthlyItem> keyOverall(List<ReservationOverallMonthlyItem> items) {
        LinkedHashMap<String, ReservationOverallMonthlyItem> m = new LinkedHashMap<>();
        for (ReservationOverallMonthlyItem i : items) {
            m.put(String.format("%04d-%02d", i.getYear(), i.getMonth()), i);
        }
        return m;
    }

    /**
     * ReservationOverallMonthlyItem 의 nullable Integer 필드 비교. 둘 다 null 이면 스킵,
     * 한쪽만 null 이거나 값이 다르면 diff 로 기록.
     */
    private Map<String, Integer[]> diffNullableFields(Object source, Object mart) {
        @SuppressWarnings("unchecked")
        Map<String, Object> sMap = objectMapper.convertValue(source, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> mMap = objectMapper.convertValue(mart, Map.class);
        Map<String, Integer[]> out = new LinkedHashMap<>();
        for (String key : sMap.keySet()) {
            Object sv = sMap.get(key);
            Object mv = mMap.get(key);
            if (sv == null && mv == null) continue;
            if (!(sv instanceof Number || sv == null)) continue;
            if (!(mv instanceof Number || mv == null)) continue;
            Integer si = sv instanceof Number n ? n.intValue() : null;
            Integer mi = mv instanceof Number n ? n.intValue() : null;
            if (java.util.Objects.equals(si, mi)) continue;
            Integer diff = (si != null && mi != null) ? si - mi : null;
            out.put(key, new Integer[]{si, mi, diff});
        }
        return out;
    }

    private Map<String, Object> mismatchEntryNullable(String key, Map<String, Integer[]> fieldDiff) {
        LinkedHashMap<String, Object> mismatched = new LinkedHashMap<>();
        fieldDiff.forEach((f, arr) -> {
            LinkedHashMap<String, Object> field = new LinkedHashMap<>();
            field.put("source", arr[0]);
            field.put("mart", arr[1]);
            field.put("diff", arr[2]);
            mismatched.put(f, field);
        });
        return Map.of("period", key, "fields", mismatched);
    }

    private static List<String> union(java.util.Set<String> a, java.util.Set<String> b) {
        java.util.TreeSet<String> u = new java.util.TreeSet<>(a);
        u.addAll(b);
        return new ArrayList<>(u);
    }

    private static Map<String, Long> countByChannelGroup(List<Map<String, Object>> rows) {
        return rows.stream().collect(
                java.util.stream.Collectors.groupingBy(
                        r -> String.valueOf(r.getOrDefault("channelGroup", "?")),
                        java.util.stream.Collectors.counting()
                )
        );
    }
}
