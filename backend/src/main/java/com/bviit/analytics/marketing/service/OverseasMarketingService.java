package com.bviit.analytics.marketing.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.bviit.analytics.marketing.dto.OverseasMarketingBucketItem;
import com.bviit.analytics.marketing.dto.OverseasMarketingCountryItem;
import com.bviit.analytics.marketing.dto.OverseasMarketingReceptionQuery;
import com.bviit.analytics.marketing.dto.OverseasMarketingStatisticsResult;
import com.bviit.analytics.marketing.repository.OverseasMarketingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Service;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OverseasMarketingService implements OverseasMarketingReader {

    private final OverseasMarketingRepository repository;
    private final OverseasMarketingCrmEnricher crmEnricher;
    private final OverseasMarketingCostEnricher costEnricher;
    private final ObjectMapper objectMapper;

    /** CRM 스냅샷으로 복원하는 파생 필드 — 조회 시 MSSQL 을 타지 않기 위한 저장 대상. */
    private static final List<String> SNAPSHOT_KEYS = List.of(
            "status", "registeredDate", "examDate", "surgeryDate",
            "operationRight", "operationLeft", "dreamlens",
            "examCost", "surgeryCost", "costSource",
            "outpatient1Date", "outpatient1", "outpatient1Cost",
            "outpatient2Date", "outpatient2", "outpatient2Cost",
            "outpatient3Date", "outpatient3", "outpatient3Cost");

    @Override
    public List<Map<String, Object>> getReceptions(OverseasMarketingReceptionQuery query) {
        // 조회는 마트만 읽는다 — CRM 병합(매칭·상세·비용)은 syncCrm() 버튼 실행 때만 수행·저장된다.
        List<Map<String, Object>> rows = repository.findReceptions(query);
        for (Map<String, Object> row : rows) {
            applySnapshot(row);
            row.remove("crmSnapshot");
        }
        if (query.status().isBlank()) {
            return rows;
        }
        return rows.stream().filter(row -> {
            String status = String.valueOf(row.getOrDefault("status", "")).trim();
            return "__empty__".equals(query.status()) ? status.isBlank() : query.status().equals(status);
        }).toList();
    }

    // ── CRM 동기화: HTTP 요청과 분리된 백그라운드 잡 ──────────────────
    // 무거운 MSSQL 조회를 HTTP 스레드에서 동기 실행하면 화면이 "죽은 것처럼" 멈춘다.
    // 버튼은 잡 시작만 하고, 화면은 /sync-crm/status 폴링으로 단계·결과를 본다.

    private final ExecutorService syncExecutor = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "overseas-crm-sync");
        thread.setDaemon(true);
        return thread;
    });
    private final AtomicBoolean syncRunning = new AtomicBoolean(false);
    private volatile Map<String, Object> syncState = Map.of("state", "idle");

    @Override
    public Map<String, Object> syncCrm() {
        // 단일 실행 락 — 새로고침·중복 클릭으로 무거운 잡이 겹치지 않게 한다(MSSQL 풀 3개 보호).
        if (!syncRunning.compareAndSet(false, true)) {
            return syncCrmStatus();
        }
        updateState("running", "시작 준비", Map.of());
        syncExecutor.submit(this::runSyncJob);
        return syncCrmStatus();
    }

    @Override
    public Map<String, Object> syncCrmStatus() {
        return syncState;
    }

    private void runSyncJob() {
        long startedAt = System.currentTimeMillis();
        try {
            updateState("running", "접수 행 조회", Map.of());
            long t0 = System.currentTimeMillis();
            List<Map<String, Object>> rows = repository.findReceptions(new OverseasMarketingReceptionQuery(
                    "1900-01-01", "2999-12-31", "reg_date", false, "", "all", false));
            log.info("[CRM동기화] 접수 행 조회 {}건 ({}ms)", rows.size(), System.currentTimeMillis() - t0);

            updateState("running", "CRM 매칭", Map.of("total", rows.size()));
            t0 = System.currentTimeMillis();
            crmEnricher.matchRows(rows);
            log.info("[CRM동기화] 매칭 완료 ({}ms)", System.currentTimeMillis() - t0);

            List<Map<String, Object>> matched = rows.stream()
                    .filter(row -> !value(row.get("customerNo")).isBlank())
                    .toList();
            // 증분 처리 — 스냅샷이 이미 있는 행은 재조회하지 않는다. 신규 매칭·수정된 행만
            // (수정 시 스냅샷이 비워지는 기존 규칙 덕에 "스냅샷 없음 = 병합 필요"가 성립한다).
            List<Map<String, Object>> toEnrich = matched.stream()
                    .filter(row -> value(row.get("crmSnapshot")).isBlank())
                    .toList();

            updateState("running", "상세·비용 병합 (%d건)".formatted(toEnrich.size()),
                    Map.of("total", rows.size(), "matched", matched.size()));
            t0 = System.currentTimeMillis();
            crmEnricher.enrichDetails(toEnrich);
            costEnricher.enrich(toEnrich);
            log.info("[CRM동기화] 상세·비용 병합 {}건 / 매칭 {}건 (스냅샷 보유 {}건 생략, {}ms)",
                    toEnrich.size(), matched.size(), matched.size() - toEnrich.size(), System.currentTimeMillis() - t0);

            updateState("running", "스냅샷 저장", Map.of());
            persistSnapshots(toEnrich);

            long review = rows.stream()
                    .filter(row -> "review".equals(value(row.get("matchStatus"))))
                    .count();
            long elapsed = System.currentTimeMillis() - startedAt;
            log.info("[CRM동기화] 완료 — 전체 {} · 매칭 {} · 확인필요 {} · 신규 병합 {} ({}ms)",
                    rows.size(), matched.size(), review, toEnrich.size(), elapsed);
            updateState("done", "완료", Map.of(
                    "total", rows.size(),
                    "matched", matched.size(),
                    "review", review,
                    "merged", toEnrich.size(),
                    "elapsedMillis", elapsed,
                    "message", "CRM 동기화 완료: 전체 %d건 중 %d건 매칭 · 확인필요 %d건 · 신규 병합 %d건"
                            .formatted(rows.size(), matched.size(), review, toEnrich.size())));
        } catch (Exception cause) {
            log.error("[CRM동기화] 실패", cause);
            updateState("error", "실패", Map.of(
                    "elapsedMillis", System.currentTimeMillis() - startedAt,
                    "message", "CRM 동기화 실패: " + cause.getMessage()));
        } finally {
            syncRunning.set(false);
        }
    }

    private void updateState(String state, String phase, Map<String, Object> extra) {
        Map<String, Object> next = new LinkedHashMap<>();
        next.put("state", state);
        next.put("phase", phase);
        next.put("updatedAt", LocalDateTime.now().toString());
        next.putAll(extra);
        syncState = Map.copyOf(next);
    }

    @Override
    public Map<String, Object> findCrmCustomer(String customerNo) {
        List<Map<String, Object>> found = repository.findCustomerByNo(customerNo.trim());
        return found.isEmpty() ? null : found.getFirst();
    }

    @Override
    public Map<String, Object> confirmMatch(long rowNumber, String customerNo, String actor) {
        Map<String, Object> rowMeta = repository.findRowMeta(rowNumber);
        if (rowMeta == null) {
            throw new IllegalArgumentException("존재하지 않는 행입니다: " + rowNumber);
        }
        Map<String, Object> customer = findCrmCustomer(customerNo);
        if (customer == null) {
            throw new IllegalArgumentException("CRM에 존재하지 않는 고객번호입니다: " + customerNo);
        }
        String confirmedNo = value(customer.get("customerNo"));
        repository.saveMatches(new MapSqlParameterSource[]{
                new MapSqlParameterSource()
                        .addValue("customerNo", confirmedNo)
                        .addValue("matchedBy", actor)
                        .addValue("rowNumber", rowNumber)});

        // 확정한 행 1건만 즉시 상세·비용을 병합해 스냅샷까지 채운다 — 화면에 바로 반영된다.
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("seq", rowNumber);
        row.put("customerNo", confirmedNo);
        crmEnricher.enrichDetails(List.of(row));
        costEnricher.enrich(List.of(row));
        persistSnapshots(List.of(row));

        return Map.of(
                "rowNumber", rowNumber,
                "customerNo", confirmedNo,
                "customerName", value(customer.get("name")),
                "matchedBy", actor);
    }

    private void applySnapshot(Map<String, Object> row) {
        String json = value(row.get("crmSnapshot"));
        if (json.isBlank()) return;
        Map<String, String> snapshot;
        try {
            snapshot = objectMapper.readValue(json, new TypeReference<Map<String, String>>() {});
        } catch (JsonProcessingException ignored) {
            return;
        }
        for (String key : SNAPSHOT_KEYS) {
            // 검사일·수술일은 시트 원본값 우선(병합 당시에도 빈 값만 채우는 규칙과 동일).
            if (("examDate".equals(key) || "surgeryDate".equals(key)) && !value(row.get(key)).isBlank()) continue;
            row.put(key, snapshot.getOrDefault(key, ""));
        }
    }

    private void persistSnapshots(List<Map<String, Object>> rows) {
        List<MapSqlParameterSource> saves = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows) {
            Object rowNumber = row.get("seq");
            if (rowNumber == null) continue;
            Map<String, String> snapshot = new LinkedHashMap<>();
            for (String key : SNAPSHOT_KEYS) snapshot.put(key, value(row.get(key)));
            try {
                saves.add(new MapSqlParameterSource()
                        .addValue("rowNumber", rowNumber)
                        .addValue("snapshot", objectMapper.writeValueAsString(snapshot)));
            } catch (JsonProcessingException ignored) {
                // 직렬화 불가 행은 건너뛴다 — 다음 동기화에서 재시도.
            }
        }
        repository.saveCrmSnapshots(saves.toArray(MapSqlParameterSource[]::new));
    }

    @Override
    public OverseasMarketingStatisticsResult getStatistics(int year, String granularity) {
        Map<String, MutableBucket> buckets = initBuckets(year, granularity);

        List<Map<String, Object>> rows = getReceptions(new OverseasMarketingReceptionQuery(
                year + "-01-01", year + "-12-31", "inquiry_date", true, "", "all", false));
        Set<String> examEvents = new HashSet<>();
        Set<String> surgeryEvents = new HashSet<>();
        Set<String> costCustomers = new HashSet<>();
        Map<String, Integer> countrySurgeries = new LinkedHashMap<>();

        for (Map<String, Object> row : rows) {
            String inquiryBucket = bucketOf(row.get("inquiryDate"), year, granularity, buckets);
            if (inquiryBucket != null) buckets.get(inquiryBucket).inquiries++;

            String eventKey = value(row.get("customerNo"));
            if (eventKey.isBlank()) eventKey = value(row.get("rowId"));
            String examBucket = bucketOf(row.get("examDate"), year, granularity, buckets);
            if (examBucket != null && examEvents.add(eventKey + "|" + value(row.get("examDate")))) {
                buckets.get(examBucket).exams++;
            }
            String surgeryBucket = bucketOf(row.get("surgeryDate"), year, granularity, buckets);
            if (surgeryBucket != null && surgeryEvents.add(eventKey + "|" + value(row.get("surgeryDate")))) {
                buckets.get(surgeryBucket).surgeries++;
                countrySurgeries.merge(value(row.get("nationality")).isBlank() ? "미등록" : value(row.get("nationality")), 1, Integer::sum);
            }

            if (costCustomers.add(eventKey)) {
                if (examBucket != null) buckets.get(examBucket).examRevenue += won(row.get("examCost"));
                if (surgeryBucket != null) buckets.get(surgeryBucket).surgeryRevenue += won(row.get("surgeryCost"));
                for (int index = 1; index <= 3; index++) {
                    String outpatientBucket = bucketOf(row.get("outpatient" + index + "Date"), year, granularity, buckets);
                    if (outpatientBucket != null) {
                        buckets.get(outpatientBucket).outpatientRevenue += won(row.get("outpatient" + index + "Cost"));
                    }
                }
            }
        }

        List<OverseasMarketingBucketItem> items = new ArrayList<>(buckets.size());
        buckets.forEach((label, value) -> items.add(new OverseasMarketingBucketItem(
                label,
                value.inquiries,
                value.exams,
                value.surgeries,
                value.examRevenue,
                value.surgeryRevenue,
                value.outpatientRevenue,
                value.lensRevenue
        )));

        List<OverseasMarketingCountryItem> countries = countrySurgeries.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .limit(10)
                .map(entry -> new OverseasMarketingCountryItem(entry.getKey(), entry.getValue()))
                .toList();

        return new OverseasMarketingStatisticsResult(year, granularity, items, countries);
    }

    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("MM-dd");

    /** 연초부터 연말까지의 월/ISO 주차/일 버킷을 순서대로 미리 생성한다. */
    private static Map<String, MutableBucket> initBuckets(int year, String granularity) {
        Map<String, MutableBucket> buckets = new LinkedHashMap<>();
        switch (granularity) {
            case "week" -> {
                int lastWeek = LocalDate.of(year, 12, 28).get(WeekFields.ISO.weekOfWeekBasedYear());
                for (int week = 1; week <= lastWeek; week++) buckets.put("W" + week, new MutableBucket());
            }
            case "day" -> {
                for (LocalDate date = LocalDate.of(year, 1, 1); date.getYear() == year; date = date.plusDays(1)) {
                    buckets.put(DAY_LABEL.format(date), new MutableBucket());
                }
            }
            default -> {
                for (int month = 1; month <= 12; month++) buckets.put(month + "월", new MutableBucket());
            }
        }
        return buckets;
    }

    private static String bucketOf(Object raw, int year, String granularity, Map<String, MutableBucket> buckets) {
        String value = value(raw);
        if (value.length() < 7 || !value.startsWith(year + "-")) return null;
        int month = parsePart(value, 5, 7);
        if (month < 1 || month > 12) return null;
        if ("month".equals(granularity)) return month + "월";
        // 주차·일 단위는 일(day)까지 유효해야 한다. (시트 자유 텍스트 방어)
        if (value.length() < 10) return null;
        int day = parsePart(value, 8, 10);
        LocalDate date;
        try {
            date = LocalDate.of(year, month, day);
        } catch (DateTimeException ignored) {
            return null;
        }
        String key = "day".equals(granularity)
                ? DAY_LABEL.format(date)
                : "W" + date.get(WeekFields.ISO.weekOfWeekBasedYear());
        return buckets.containsKey(key) ? key : null;
    }

    private static int parsePart(String value, int from, int to) {
        try {
            return Integer.parseInt(value.substring(from, to));
        } catch (NumberFormatException ignored) {
            return -1;
        }
    }

    private static long won(Object raw) {
        String digits = value(raw).replaceAll("[^0-9-]", "");
        if (digits.isBlank() || "-".equals(digits)) return 0L;
        try {
            return Long.parseLong(digits);
        } catch (NumberFormatException ignored) {
            return 0L;
        }
    }

    private static String value(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private static final class MutableBucket {
        private int inquiries;
        private int exams;
        private int surgeries;
        private long examRevenue;
        private long surgeryRevenue;
        private long outpatientRevenue;
        private long lensRevenue;
    }
}
