package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.dto.ExaminationMonthlyItem;
import com.bviit.analytics.exam.repository.ExaminationStatsRepository;
import com.bviit.analytics.common.util.MonthlyBuckets;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Year;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class ExaminationStatsService implements ExaminationStatsReader {

    private static final Map<Integer, int[]> LEGACY_VISION_CORRECTION = Map.of(
            2024, new int[] {2134, 1799, 1045, 928, 1171, 1254, 1512, 1570, 1219, 1127, 1431, 2073},
            2025, new int[] {2307, 1965, 1022, 1002, 1118, 1076, 1124, 1154, 1071, 1245, 991, 1702}
    );

    private static final Map<Integer, int[]> LEGACY_CATARACT = Map.of(
            2024, new int[] {76, 64, 53, 50, 65, 43, 62, 51, 48, 73, 70, 75},
            2025, new int[] {74, 68, 76, 59, 55, 55, 74, 78, 76, 66, 53, 96}
    );

    private final ExaminationStatsRepository repository;
    private final ObjectMapper objectMapper;

    @Value("${stats.cache.examination.enabled:true}")
    private boolean cacheEnabled;

    @Value("${stats.cache.dir:.cache/stats}")
    private String cacheDir;

    /**
     * 연도별 월간 검사 유형별 건수 (시력교정=사람, 드림렌즈=사람, 백내장=눈).
     * 빈 달은 0. total은 화면 전체 검사건수와 같은 값.
     */
    @Override
    @Transactional(readOnly = true)
    public List<ExaminationMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();

        Optional<List<ExaminationMonthlyItem>> cached = readCache(normalizedYears);
        if (cached.isPresent()) {
            return cached.get();
        }

        int minYear = normalizedYears.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = normalizedYears.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String from = minYear + "-01-01";
        String to = maxYear + "-12-31";

        Map<String, Integer> vision = countsByMonth(repository.findVisionCorrectionMonthly(from, to));
        Map<String, Integer> dreamlens = countsByMonth(repository.findDreamlensMonthly(from, to));
        Map<String, Integer> cataract = countsByMonth(repository.findCataractMonthly(from, to));

        LinkedHashMap<String, ExaminationMonthlyItem> map =
                MonthlyBuckets.initialize(normalizedYears, this::emptyMonthlyItem);

        for (Map.Entry<String, ExaminationMonthlyItem> entry : map.entrySet()) {
            String key = entry.getKey();
            ExaminationMonthlyItem cur = entry.getValue();
            int v = legacyVisionCorrection(cur.getYear(), cur.getMonth())
                    .orElse(vision.getOrDefault(key, 0));
            int d = dreamlens.getOrDefault(key, 0);
            int c = legacyCataract(cur.getYear(), cur.getMonth())
                    .orElse(cataract.getOrDefault(key, 0));
            int examTotal = v + d + c;
            entry.setValue(ExaminationMonthlyItem.builder()
                    .year(cur.getYear())
                    .month(cur.getMonth())
                    .visionCorrection(v)
                    .dreamlens(d)
                    .cataract(c)
                    .examTotal(examTotal)
                    .total(examTotal)
                    .build());
        }

        List<ExaminationMonthlyItem> result = new ArrayList<>(map.values());
        writeCache(normalizedYears, result);
        return result;
    }

    private Map<String, Integer> countsByMonth(List<Map<String, Object>> rows) {
        Map<String, Integer> counts = new HashMap<>();
        for (Map<String, Object> row : rows) {
            counts.put(MonthlyBuckets.key(toInt(row.get("yr")), toInt(row.get("mo"))), toInt(row.get("cnt")));
        }
        return counts;
    }

    private ExaminationMonthlyItem emptyMonthlyItem(int year, int month) {
        return ExaminationMonthlyItem.builder()
                .year(year)
                .month(month)
                .visionCorrection(0)
                .dreamlens(0)
                .cataract(0)
                .examTotal(0)
                .total(0)
                .build();
    }

    private Optional<Integer> legacyVisionCorrection(int year, int month) {
        int[] values = LEGACY_VISION_CORRECTION.get(year);
        if (values == null || month < 1 || month > values.length) {
            return Optional.empty();
        }
        return Optional.of(values[month - 1]);
    }

    private Optional<Integer> legacyCataract(int year, int month) {
        int[] values = LEGACY_CATARACT.get(year);
        if (values == null || month < 1 || month > values.length) {
            return Optional.empty();
        }
        return Optional.of(values[month - 1]);
    }

    /**
     * 당해연도(라이브) 포함 요청은 캐시하지 않는다.
     * 2024~2025는 레거시 상수로 덮어써 불변이지만, 2026+ 라이브값은 EXAM 덮어쓰기로 시점마다 변동하므로
     * 영구 파일캐시에 동결되면 안 된다(ProcedureExam과 동일 정책).
     */
    private boolean isLiveRequest(List<Integer> years) {
        int currentYear = Year.now().getValue();
        return years.stream().anyMatch(y -> y >= currentYear);
    }

    private Optional<List<ExaminationMonthlyItem>> readCache(List<Integer> years) {
        if (!cacheEnabled || isLiveRequest(years)) {
            return Optional.empty();
        }

        Path file = cacheFile(years);
        if (!Files.exists(file)) {
            return Optional.empty();
        }

        try {
            return Optional.of(objectMapper.readValue(
                    file.toFile(),
                    new TypeReference<List<ExaminationMonthlyItem>>() {}
            ));
        } catch (IOException ignored) {
            return Optional.empty();
        }
    }

    private void writeCache(List<Integer> years, List<ExaminationMonthlyItem> rows) {
        if (!cacheEnabled || isLiveRequest(years)) {
            return;
        }

        Path file = cacheFile(years);
        try {
            Files.createDirectories(file.getParent());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(file.toFile(), rows);
        } catch (IOException ignored) {
            // 캐시 저장 실패는 통계 조회 자체를 막지 않는다.
        }
    }

    private Path cacheFile(List<Integer> years) {
        String key = String.join("_", years.stream().map(String::valueOf).toList());
        return Path.of(cacheDir).toAbsolutePath().normalize()
                .resolve("examination-monthly-v7-" + key + ".json");
    }
}
