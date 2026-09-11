package com.bviit.analytics.marketing.service;

import com.bviit.analytics.marketing.repository.OverseasMarketingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 해외마케팅 예약통계 — 레거시 구글시트 숫자(~2026-08-23 시드)와
 * 접수리스트 자동 집계(2026-08-24~)를 하나의 표로 병합한다.
 * 우선순위: 담당자 수동 수정(manual) > 시드(seed) > 자동 집계(auto).
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OverseasReservationStatsService {

    /** 이 날짜까지는 레거시 시트 숫자를 쓰고, 이후는 접수리스트에서 자동 집계한다. */
    private static final LocalDate CUTOVER = LocalDate.of(2026, 8, 23);

    private static final Set<String> GROUP_KEYS = Set.of("total", "anglo", "china", "vietnam", "mongolia", "agency");
    private static final Set<String> BASE_METRICS = Set.of("inq", "rsv", "exam", "surgery", "outpatient");
    private static final Map<String, Set<String>> GROUP_CHANNELS = Map.of(
            "anglo", Set.of("homepage", "email", "kakao", "whatsapp", "meta_dm", "phone", "contact_center", "etc"),
            "china", Set.of("web_mail_phone", "wechat", "xiaohongshu", "line", "insta_tiktok", "creatrip", "contact_center", "etc"),
            "vietnam", Set.of("meta", "phone", "etc"),
            "mongolia", Set.of("facebook", "insta", "phone", "etc"),
            "agency", Set.of("direct", "creatrip"),
            "total", Set.of());

    private static final Set<String> CHINA_NATIONALITIES = Set.of("중국", "대만", "홍콩", "마카오");
    private static final Set<String> CHINA_ONLY_CHANNELS = Set.of("위챗", "샤오홍슈", "라인");
    private static final Pattern ISO_DATE = Pattern.compile("(\\d{4}-\\d{2}-\\d{2})");

    private final OverseasMarketingRepository repository;
    private final ObjectMapper objectMapper;

    public Map<String, Object> getStats(int year, String granularity) {
        LocalDate from = LocalDate.of(year, 1, 1);
        LocalDate to = LocalDate.of(year, 12, 31);

        // 일별 셀 값: 자동 집계를 깔고 저장값(시드·수동)으로 덮는다.
        Map<LocalDate, Map<String, Integer>> daily = computeAuto(from, to);
        for (Map<String, Object> row : repository.findReservationStats(from.toString(), to.toString())) {
            LocalDate date = LocalDate.parse(String.valueOf(row.get("statDate")));
            String cellKey = row.get("groupKey") + "." + row.get("metricKey");
            daily.computeIfAbsent(date, d -> new HashMap<>())
                    .put(cellKey, ((Number) row.get("value")).intValue());
        }
        fillTotals(daily);

        Map<String, Map<String, Integer>> buckets = new TreeMap<>();
        for (Map.Entry<LocalDate, Map<String, Integer>> entry : daily.entrySet()) {
            String bucket = bucketOf(entry.getKey(), granularity);
            Map<String, Integer> acc = buckets.computeIfAbsent(bucket, b -> new HashMap<>());
            entry.getValue().forEach((key, value) -> acc.merge(key, value, Integer::sum));
        }

        List<Map<String, Object>> bucketList = new ArrayList<>();
        for (Map.Entry<String, Map<String, Integer>> entry : buckets.entrySet()) {
            Map<String, Integer> nonZero = new LinkedHashMap<>();
            entry.getValue().forEach((key, value) -> { if (value != 0) nonZero.put(key, value); });
            bucketList.add(Map.of("bucket", entry.getKey(), "values", nonZero));
        }
        return Map.of(
                "year", year,
                "granularity", granularity,
                "cutover", CUTOVER.toString(),
                "buckets", bucketList);
    }

    public Map<String, Object> updateCell(LocalDate date, String groupKey, String metricKey, int value, String actor) {
        if (!GROUP_KEYS.contains(groupKey)) {
            throw new IllegalArgumentException("지원하지 않는 그룹입니다: " + groupKey);
        }
        boolean channelMetric = (metricKey.endsWith("_inq") || metricKey.endsWith("_rsv"))
                && GROUP_CHANNELS.get(groupKey).contains(metricKey.substring(0, metricKey.lastIndexOf('_')));
        if (!BASE_METRICS.contains(metricKey) && !channelMetric) {
            throw new IllegalArgumentException("지원하지 않는 지표입니다: " + groupKey + "." + metricKey);
        }
        if (value < 0 || value > 99_999) {
            throw new IllegalArgumentException("값은 0~99999 범위여야 합니다.");
        }
        repository.upsertReservationStat(date.toString(), groupKey, metricKey, value, actor);
        return Map.of("date", date.toString(), "groupKey", groupKey, "metricKey", metricKey, "value", value);
    }

    // ── 자동 집계 (CUTOVER 다음 날부터) ─────────────────────────────

    private Map<LocalDate, Map<String, Integer>> computeAuto(LocalDate from, LocalDate to) {
        Map<LocalDate, Map<String, Integer>> daily = new HashMap<>();
        LocalDate autoFrom = CUTOVER.plusDays(1).isAfter(from) ? CUTOVER.plusDays(1) : from;
        if (autoFrom.isAfter(to)) return daily;

        for (Map<String, Object> row : repository.findReservationStatsSourceRows()) {
            String nationality = str(row.get("nationality"));
            String channel = str(row.get("channel"));
            String group = classifyGroup(nationality, channel);
            String channelKey = classifyChannel(group, channel, str(row.get("onlineChannel")));

            Map<String, String> snapshot = parseSnapshot(str(row.get("crmSnapshot")));
            LocalDate inquiryDate = parseDate(str(row.get("inquiryDate")));
            LocalDate examDate = firstDate(str(row.get("examDate")), snapshot.getOrDefault("examDate", ""));
            LocalDate surgeryDate = firstDate(str(row.get("surgeryDate")), snapshot.getOrDefault("surgeryDate", ""));

            if (inRange(inquiryDate, autoFrom, to)) {
                add(daily, inquiryDate, group, "inq");
                add(daily, inquiryDate, group, channelKey + "_inq");
                if (examDate != null) {
                    add(daily, inquiryDate, group, "rsv");
                    add(daily, inquiryDate, group, channelKey + "_rsv");
                }
                if ("외래문의".equals(snapshot.getOrDefault("status", ""))) {
                    add(daily, inquiryDate, group, "outpatient");
                }
            }
            if (inRange(examDate, autoFrom, to)) add(daily, examDate, group, "exam");
            if (inRange(surgeryDate, autoFrom, to)) add(daily, surgeryDate, group, "surgery");
        }
        return daily;
    }

    /** 자동 구간의 total.* — 저장값(수동)이 없으면 5개 그룹 합으로 채운다. */
    private void fillTotals(Map<LocalDate, Map<String, Integer>> daily) {
        for (Map.Entry<LocalDate, Map<String, Integer>> entry : daily.entrySet()) {
            if (!entry.getKey().isAfter(CUTOVER)) continue; // 시드 구간 total은 레거시 값 그대로
            Map<String, Integer> cells = entry.getValue();
            for (String metric : BASE_METRICS) {
                if (cells.containsKey("total." + metric)) continue;
                int sum = 0;
                for (String group : GROUP_KEYS) {
                    if (!"total".equals(group)) sum += cells.getOrDefault(group + "." + metric, 0);
                }
                if (sum != 0) cells.put("total." + metric, sum);
            }
        }
    }

    // ── 분류 규칙 (초안 — 실측 검증 후 조정 예정) ─────────────────────

    private static String classifyGroup(String nationality, String channel) {
        if ("에이전시".equals(channel)) return "agency";
        if ("크리에이트립".equals(channel)) {
            return CHINA_NATIONALITIES.contains(nationality) ? "china" : "agency";
        }
        if (CHINA_NATIONALITIES.contains(nationality)) return "china";
        if ("베트남".equals(nationality) || "배트남".equals(nationality)) return "vietnam";
        if ("몽골".equals(nationality)) return "mongolia";
        if (nationality.isBlank() && CHINA_ONLY_CHANNELS.contains(channel)) return "china";
        return "anglo";
    }

    private static String classifyChannel(String group, String channel, String onlineChannel) {
        return switch (group) {
            case "anglo" -> switch (channel) {
                case "홈페이지" -> "homepage";
                case "이메일" -> "email";
                case "카카오톡" -> "kakao";
                case "왓츠앱" -> "whatsapp";
                case "Meta", "DM" -> "meta_dm";
                case "전화" -> "phone";
                case "고객지원실" -> "contact_center";
                default -> "etc";
            };
            case "china" -> switch (channel) {
                case "홈페이지", "이메일", "전화" -> "web_mail_phone";
                case "위챗" -> "wechat";
                case "샤오홍슈" -> "xiaohongshu";
                case "라인" -> "line";
                case "Meta", "DM" -> "insta_tiktok";
                case "크리에이트립" -> "creatrip";
                case "고객지원실" -> "contact_center";
                default -> "etc";
            };
            case "vietnam" -> switch (channel) {
                case "Meta", "DM" -> "meta";
                case "전화" -> "phone";
                default -> "etc";
            };
            case "mongolia" -> {
                if (onlineChannel.contains("페이스") || "페이스북".equals(channel)) yield "facebook";
                if ("Meta".equals(channel) || "DM".equals(channel)) yield "insta";
                if ("전화".equals(channel)) yield "phone";
                yield "etc";
            }
            case "agency" -> "크리에이트립".equals(channel) ? "creatrip" : "direct";
            default -> "etc";
        };
    }

    // ── 헬퍼 ─────────────────────────────────────────────────────

    private Map<String, String> parseSnapshot(String json) {
        if (json.isBlank()) return Map.of();
        try {
            Map<String, Object> parsed = objectMapper.readValue(json, new TypeReference<>() {});
            Map<String, String> result = new HashMap<>();
            parsed.forEach((key, value) -> result.put(key, value == null ? "" : String.valueOf(value)));
            return result;
        } catch (Exception e) {
            return Map.of();
        }
    }

    private static LocalDate firstDate(String primary, String fallback) {
        LocalDate date = parseDate(primary);
        return date != null ? date : parseDate(fallback);
    }

    /** 자유 서식 문자열에서 첫 YYYY-MM-DD를 뽑는다(파싱 불가·미정 텍스트는 무시). */
    private static LocalDate parseDate(String text) {
        if (text == null || text.isBlank()) return null;
        Matcher matcher = ISO_DATE.matcher(text);
        if (!matcher.find()) return null;
        try {
            return LocalDate.parse(matcher.group(1));
        } catch (Exception e) {
            return null;
        }
    }

    private static boolean inRange(LocalDate date, LocalDate from, LocalDate to) {
        return date != null && !date.isBefore(from) && !date.isAfter(to);
    }

    private static void add(Map<LocalDate, Map<String, Integer>> daily, LocalDate date, String group, String metric) {
        daily.computeIfAbsent(date, d -> new HashMap<>()).merge(group + "." + metric, 1, Integer::sum);
    }

    private static String bucketOf(LocalDate date, String granularity) {
        return switch (granularity) {
            case "week" -> "%d-W%02d".formatted(
                    date.get(IsoFields.WEEK_BASED_YEAR), date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR));
            case "day" -> date.toString();
            default -> "%d-%02d".formatted(date.getYear(), date.getMonthValue());
        };
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }
}
