package com.bviit.analytics.batch.admin;

import com.bviit.analytics.reservation.dto.ReservationListResult;
import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.repository.ReservationListRepository;
import com.bviit.analytics.reservation.repository.ReservationStatsMartRepository;
import com.bviit.analytics.reservation.service.ReservationListService;
import com.bviit.analytics.reservation.service.ReservationStatsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
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
 * 기대: ReservationMartJob이 ReservationStatsService/ReservationListService의 결과를 그대로
 *       마트에 upsert하므로 현재 방식에서는 diff가 0이어야 정상.
 *       diff가 나오면 배치/서비스/마트 셋 중 하나가 어긋난 것.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationReconcileService {

    private final ReservationStatsService statsService;   // MSSQL 직결
    private final ReservationListService listService;      // MSSQL 직결
    private final ReservationListRepository listRepository; // MSSQL 직결 (kakao daily)
    private final ReservationStatsMartRepository martRepo;  // Postgres 마트
    private final ObjectMapper objectMapper;

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
