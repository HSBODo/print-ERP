package com.bviit.analytics.marketing.service;

import com.bviit.analytics.marketing.repository.OverseasMarketingRepository;
import com.bviit.analytics.marketing.repository.OverseasMarketingRepository.PhoneEmailCandidates;
import com.bviit.analytics.marketing.util.OverseasCustomerKeys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** 시트 행을 원본 CRM 고객에 유일 매칭하고 자바 방식의 예약·수술 정보를 합친다. */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OverseasMarketingCrmEnricher {

    private static final int DETAIL_BATCH_SIZE = 500;
    private final OverseasMarketingRepository repository;

    /** 매칭만 수행한다 — 상세 병합은 스냅샷이 없는 행에 한해 {@link #enrichDetails}로 별도 실행. */
    public void matchRows(List<Map<String, Object>> rows) {
        matchUnmatchedRows(rows);
    }

    /** 전달된 행(모두 매칭 확정)에 대해 CRM 고객 상세를 조회해 병합한다. */
    public void enrichDetails(List<Map<String, Object>> rows) {
        Set<String> customerNos = new LinkedHashSet<>();
        for (Map<String, Object> row : rows) {
            String customerNo = value(row.get("customerNo"));
            if (!customerNo.isBlank()) customerNos.add(customerNo);
        }

        Map<String, Map<String, Object>> details = new LinkedHashMap<>();
        List<String> customerNoList = new ArrayList<>(customerNos);
        for (int from = 0; from < customerNoList.size(); from += DETAIL_BATCH_SIZE) {
            List<String> batch = customerNoList.subList(from, Math.min(from + DETAIL_BATCH_SIZE, customerNoList.size()));
            for (Map<String, Object> detail : repository.findCustomerDetails(batch)) {
                details.put(value(detail.get("customerNo")), detail);
            }
        }
        for (Map<String, Object> row : rows) {
            Map<String, Object> detail = details.get(value(row.get("customerNo")));
            if (detail != null) merge(row, detail);
        }
    }

    /**
     * 매칭 미확정 행을 4단계로 처리한다:
     *  1) 이름+생일(월일 스왑 허용) 유일 일치 → 매칭 확정
     *  2) 시트의 검사일/수술일 당일 내원자 중 이름(정규화) 또는 생일(스왑 허용) 유일 일치 → 매칭 확정
     *     (날짜가 후보군을 좁혀 주므로 이름 철자가 CRM과 달라도 생일로 잡는다)
     *  3) 전화 뒷8자리 / 이메일 유일 후보 + 생일 일치·스왑 → 매칭 확정
     *  4) 유일 후보인데 생일이 다르거나 없으면 → '확인필요' 후보로 보관 (담당자 팝업 확정 대상)
     */
    private void matchUnmatchedRows(List<Map<String, Object>> rows) {
        List<Map<String, Object>> unmatched = rows.stream()
                .filter(row -> value(row.get("customerNo")).isBlank())
                .toList();
        if (unmatched.isEmpty()) return;

        CandidateKeys keys = candidateKeys(unmatched);
        // 후보 조회별 소요시간을 남긴다 — 병목 SQL을 로그만으로 특정하기 위함.
        List<Map<String, Object>> nameCandidates = timed("이름 후보", keys.names.size(), () -> keys.names.isEmpty()
                ? List.of() : repository.findCandidatesByNames(new ArrayList<>(keys.names)));
        // 전화·이메일은 CUSTOM 전수 스캔이 필요해 한 번의 스트림으로 함께 뽑는다(자세한 이유는 저장소 주석).
        PhoneEmailCandidates phoneOrEmail = timed2("전화·이메일 후보", keys.phones.size() + keys.emails.size(),
                () -> repository.findCandidatesByPhoneOrEmail(keys.phones, keys.emails));
        List<Map<String, Object>> phoneCandidates = phoneOrEmail.phones();
        List<Map<String, Object>> emailCandidates = phoneOrEmail.emails();
        Map<String, List<Map<String, Object>>> examDateCandidates = byEventDate(
                timed("검사일 후보", keys.examDates.size(), () -> keys.examDates.isEmpty()
                        ? List.of() : repository.findExamDateCandidates(new ArrayList<>(keys.examDates))));
        Map<String, List<Map<String, Object>>> surgeryDateCandidates = byEventDate(
                timed("수술일 후보", keys.surgeryDates.size(), () -> keys.surgeryDates.isEmpty()
                        ? List.of() : repository.findSurgeryDateCandidates(new ArrayList<>(keys.surgeryDates))));

        List<MapSqlParameterSource> matches = new ArrayList<>();
        List<MapSqlParameterSource> candidates = new ArrayList<>();
        String matchedDate = LocalDate.now().toString();
        for (Map<String, Object> row : unmatched) {
            Map<String, Object> match = uniqueNameDob(row, nameCandidates);
            if (match != null) {
                confirm(row, match, matchedDate, matches);
                continue;
            }
            match = uniqueEventDate(row, examDateCandidates.get(isoDate(row.get("examDate"))));
            if (match == null) {
                match = uniqueEventDate(row, surgeryDateCandidates.get(isoDate(row.get("surgeryDate"))));
            }
            if (match != null) {
                confirm(row, match, matchedDate, matches);
                continue;
            }
            Map<String, Object> candidate = uniquePhone(row, phoneCandidates);
            String basis = "전화번호 일치";
            if (candidate == null) {
                candidate = uniqueEmail(row, emailCandidates);
                basis = "이메일 일치";
            }
            if (candidate == null) continue;

            String dobStatus = dobStatus(value(row.get("birthDate")), value(candidate.get("birthDate")));
            if ("equal".equals(dobStatus) || "swapped".equals(dobStatus)) {
                confirm(row, candidate, matchedDate, matches);
            } else {
                String reason = basis + " · " + ("missing".equals(dobStatus)
                        ? "생일 정보 없음"
                        : "생일 불일치(시트 %s / CRM %s)".formatted(value(row.get("birthDate")), value(candidate.get("birthDate"))));
                row.put("candidateCustomerNo", value(candidate.get("customerNo")));
                row.put("candidateReason", reason);
                row.put("matchStatus", "review");
                Object rowNumber = row.get("seq");
                if (rowNumber != null) {
                    candidates.add(new MapSqlParameterSource()
                            .addValue("candidateNo", value(candidate.get("customerNo")))
                            .addValue("reason", reason)
                            .addValue("rowNumber", rowNumber));
                }
            }
        }
        repository.saveMatches(matches.toArray(MapSqlParameterSource[]::new));
        repository.saveCandidates(candidates.toArray(MapSqlParameterSource[]::new));
    }

    private void confirm(Map<String, Object> row, Map<String, Object> match, String matchedDate,
                         List<MapSqlParameterSource> saves) {
        String customerNo = value(match.get("customerNo"));
        row.put("customerNo", customerNo);
        row.put("matchedDate", matchedDate);
        row.put("matchStatus", "matched");
        Object rowNumber = row.get("seq");
        if (rowNumber != null) {
            saves.add(new MapSqlParameterSource()
                    .addValue("customerNo", customerNo)
                    .addValue("matchedBy", "CRM_Sync")
                    .addValue("rowNumber", rowNumber));
        }
    }

    /** equal / swapped(월일 뒤바뀜) / different / missing */
    private static String dobStatus(String sheetDob, String crmDob) {
        if (sheetDob.isBlank() || crmDob.isBlank()) return "missing";
        if (sheetDob.equals(crmDob)) return "equal";
        String[] s = sheetDob.split("-");
        String[] c = crmDob.split("-");
        if (s.length == 3 && c.length == 3
                && s[0].equals(c[0]) && s[1].equals(c[2]) && s[2].equals(c[1])) {
            return "swapped";
        }
        return "different";
    }

    private CandidateKeys candidateKeys(List<Map<String, Object>> rows) {
        CandidateKeys keys = new CandidateKeys();
        for (Map<String, Object> row : rows) {
            String name = value(row.get("name"));
            if (!name.isBlank() && !"-".equals(name) && !"(미입력)".equals(name)) keys.names.add(name);
            String phone = digits(row.get("contact"));
            if (phone.length() >= 8) keys.phones.add(phone.substring(phone.length() - 8));
            String email = email(row.get("email"));
            if (!email.isBlank()) keys.emails.add(email);
            String examDate = isoDate(row.get("examDate"));
            if (!examDate.isBlank()) keys.examDates.add(examDate);
            String surgeryDate = isoDate(row.get("surgeryDate"));
            if (!surgeryDate.isBlank()) keys.surgeryDates.add(surgeryDate);
        }
        return keys;
    }

    private static List<Map<String, Object>> timed(String label, int keyCount,
                                                   java.util.function.Supplier<List<Map<String, Object>>> query) {
        long started = System.currentTimeMillis();
        List<Map<String, Object>> result = query.get();
        log.info("[CRM동기화] {} 조회 — 키 {}개 → 후보 {}건 ({}ms)",
                label, keyCount, result.size(), System.currentTimeMillis() - started);
        return result;
    }

    private static PhoneEmailCandidates timed2(String label, int keyCount,
                                               java.util.function.Supplier<PhoneEmailCandidates> query) {
        long started = System.currentTimeMillis();
        PhoneEmailCandidates result = query.get();
        log.info("[CRM동기화] {} 조회 — 키 {}개 → 전화 {}건·이메일 {}건 ({}ms)",
                label, keyCount, result.phones().size(), result.emails().size(),
                System.currentTimeMillis() - started);
        return result;
    }

    /** 이벤트 날짜(검사일/수술일)별 후보 목록으로 묶는다. */
    private static Map<String, List<Map<String, Object>>> byEventDate(List<Map<String, Object>> candidates) {
        Map<String, List<Map<String, Object>>> byDate = new LinkedHashMap<>();
        for (Map<String, Object> candidate : candidates) {
            byDate.computeIfAbsent(value(candidate.get("eventDate")), d -> new ArrayList<>()).add(candidate);
        }
        return byDate;
    }

    /**
     * 그 날짜 내원자 중 ① 이름(토큰 정렬 — 성·이름 순서 뒤바뀜 허용) 유일 일치
     * → ② 생일(스왑 허용) 유일 일치 순으로 찾는다.
     * 날짜가 이미 후보군을 좁혔으므로 둘 중 하나만 맞아도 동일인 신뢰도가 높다.
     * (실측: 시트 "Anujin Tsendsuren" ↔ CRM "TSENDSUREN ANUJIN" + CRM 생일 연도 오타 사례)
     */
    private Map<String, Object> uniqueEventDate(Map<String, Object> row, List<Map<String, Object>> candidates) {
        if (candidates == null || candidates.isEmpty()) return null;
        Set<String> variants = nameVariants(value(row.get("name")));
        if (!variants.isEmpty()) {
            List<Map<String, Object>> byName = candidates.stream()
                    .filter(candidate -> variants.contains(sortedNameTokens(value(candidate.get("name")))))
                    .toList();
            if (byName.size() == 1) return byName.getFirst();
        }
        String birthDate = value(row.get("birthDate"));
        if (!birthDate.isBlank()) {
            List<Map<String, Object>> byDob = candidates.stream()
                    .filter(candidate -> {
                        String status = dobStatus(birthDate, value(candidate.get("birthDate")));
                        return "equal".equals(status) || "swapped".equals(status);
                    })
                    .toList();
            if (byDob.size() == 1) return byDob.getFirst();
        }
        return null;
    }

    /** 시트 이름의 대조 변형: 전체 + 줄·괄호·슬래시 구분 표기(한글/영문 병기)를 각각 토큰 정렬 키로 만든다. */
    private static Set<String> nameVariants(String raw) {
        Set<String> variants = new LinkedHashSet<>();
        String whole = sortedNameTokens(raw);
        if (!whole.isBlank()) variants.add(whole);
        for (String part : raw.split("[\\r\\n/()]+")) {
            String key = sortedNameTokens(part);
            if (!key.isBlank()) variants.add(key);
        }
        return variants;
    }

    /** 이름 토큰 정렬 키 — 대문자화 후 문자·숫자 외 경계로 나눠 정렬(성·이름 순서, 공백·점 표기 차이 무시). */
    private static String sortedNameTokens(String name) {
        return java.util.Arrays.stream(name.toUpperCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+"))
                .filter(token -> !token.isBlank())
                .sorted()
                .reduce((a, b) -> a + " " + b)
                .orElse("");
    }

    private static final java.util.regex.Pattern ISO_DATE = java.util.regex.Pattern.compile("(\\d{4}-\\d{2}-\\d{2})");

    /** 자유 서식 문자열에서 첫 YYYY-MM-DD를 뽑는다("미정" 등 텍스트는 무시). */
    private static String isoDate(Object value) {
        java.util.regex.Matcher matcher = ISO_DATE.matcher(value(value));
        return matcher.find() ? matcher.group(1) : "";
    }

    private Map<String, Object> uniqueNameDob(Map<String, Object> row, List<Map<String, Object>> candidates) {
        String name = value(row.get("name"));
        String birthDate = value(row.get("birthDate"));
        if (!name.isBlank() && !birthDate.isBlank()) {
            List<Map<String, Object>> matches = candidates.stream()
                    .filter(candidate -> name.equals(value(candidate.get("name"))))
                    .filter(candidate -> {
                        String status = dobStatus(birthDate, value(candidate.get("birthDate")));
                        // 시트·CRM 한쪽이 생일을 월일 스왑으로 기록한 사례가 실측 확인됨 — 동일인으로 본다.
                        return "equal".equals(status) || "swapped".equals(status);
                    })
                    .toList();
            if (matches.size() == 1) return matches.getFirst();
        }
        return null;
    }

    private static final java.util.regex.Pattern KOREAN_PHONE = java.util.regex.Pattern.compile("^(010|011|01[6-9]|82).*");

    private Map<String, Object> uniquePhone(Map<String, Object> row, List<Map<String, Object>> candidates) {
        String phone = digits(row.get("contact"));
        if (phone.length() >= 8) {
            String suffix = phone.substring(phone.length() - 8);
            // 시트의 한국 번호는 "(+82)" 표기뿐 아니라 "010-…" 표기가 대부분이다.
            boolean sheetKorean = value(row.get("contact")).startsWith("(+82)") || KOREAN_PHONE.matcher(phone).matches();
            List<Map<String, Object>> matches = candidates.stream().filter(candidate -> {
                String candidatePhone = digits(candidate.get("contact"));
                if (candidatePhone.length() < 8 || !candidatePhone.endsWith(suffix)) return false;
                boolean crmKorean = KOREAN_PHONE.matcher(candidatePhone).matches();
                return sheetKorean == crmKorean;
            }).toList();
            if (matches.size() == 1) return matches.getFirst();
        }
        return null;
    }

    private Map<String, Object> uniqueEmail(Map<String, Object> row, List<Map<String, Object>> candidates) {
        String email = email(row.get("email"));
        if (!email.isBlank()) {
            List<Map<String, Object>> matches = candidates.stream()
                    .filter(candidate -> email.equals(email(candidate.get("email"))))
                    .toList();
            if (matches.size() == 1) return matches.getFirst();
        }
        return null;
    }

    private void merge(Map<String, Object> row, Map<String, Object> detail) {
        row.put("status", value(detail.get("status")));
        row.put("registeredDate", value(detail.get("registeredDate")));
        if (blank(row.get("examDate"))) row.put("examDate", value(detail.get("examDate")));
        if (blank(row.get("surgeryDate"))) row.put("surgeryDate", value(detail.get("surgeryDate")));
        row.put("operationRight", value(detail.get("operationRight")));
        row.put("operationLeft", value(detail.get("operationLeft")));
        row.put("dreamlens", value(detail.get("dreamlens")));
    }

    private static boolean blank(Object value) {
        String text = value(value);
        return text.isBlank() || "-".equals(text);
    }

    private static String digits(Object value) {
        return value(value).replaceAll("[^0-9]", "");
    }

    /** 저장소 스트림 필터와 <b>반드시 같은 규칙</b>이어야 매칭이 일치한다 — {@link OverseasCustomerKeys#email}. */
    private static String email(Object value) {
        return OverseasCustomerKeys.email(value(value));
    }

    private static String value(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private static final class CandidateKeys {
        private final Set<String> names = new LinkedHashSet<>();
        private final Set<String> phones = new LinkedHashSet<>();
        private final Set<String> emails = new LinkedHashSet<>();
        private final Set<String> examDates = new LinkedHashSet<>();
        private final Set<String> surgeryDates = new LinkedHashSet<>();
    }
}
