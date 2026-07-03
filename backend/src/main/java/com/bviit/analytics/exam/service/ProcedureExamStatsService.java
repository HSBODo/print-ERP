package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.dto.ProcedureExamMonthlyItem;
import com.bviit.analytics.exam.repository.ProcedureExamStatsRepository;
import com.bviit.analytics.common.util.MonthlyBuckets;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

/**
 * 시술별 검사 건수("검사수") 서비스.
 *
 * 검사수 = EXAM 행수 + Cataract_Exam 세션수.
 *   - 2024~2025: 레거시 확정값(업로드 데이터) 고정 사용. DB 조회 안 함.
 *   - 2026년 이후: prod DB 계산값 사용.
 *
 * 2026 값은 EXAM 스냅샷 특성상 조회 시점마다 미세 변동할 수 있어 캐시하지 않는다(항상 라이브).
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class ProcedureExamStatsService implements ProcedureExamStatsReader {

    /** 레거시 "검사수" 차트 확정값 (월별, 1~12월). 검사수 = 시력교정+드림렌즈(EXAM) + 백내장 세션. */
    private static final Map<Integer, int[]> LEGACY_EXAM_COUNT = Map.of(
            2024, new int[] {2432, 2035, 1286, 1140, 1380, 1388, 1674, 1728, 1324, 1258, 1568, 2234},
            2025, new int[] {2436, 2114, 1177, 1124, 1256, 1132, 1291, 1337, 1190, 1357, 1085, 1860}
    );

    /** 레거시 "원데이 검사" 차트 확정값 (월별, 1~12월). */
    private static final Map<Integer, int[]> LEGACY_ONE_DAY_EXAM_COUNT = Map.of(
            2024, new int[] {1127, 1100, 573, 476, 640, 645, 744, 782, 699, 620, 697, 1097},
            2025, new int[] {1460, 1182, 616, 533, 627, 519, 577, 604, 459, 867, 495, 785}
    );

    private final ProcedureExamStatsRepository repository;

    /**
     * 연도별 월간 검사수. 빈 달은 0.
     * 2024/2025는 레거시 확정값, 그 외 연도는 DB 계산값.
     */
    @Override
    @Transactional(readOnly = true)
    public List<ProcedureExamMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();

        // 2024·2025는 레거시 확정값으로 덮어쓰므로(아래 legacy*Count) DB는 레거시 미보유 연도만 조회한다.
        // 두 레거시 맵의 키가 동일(2024·2025)하므로 한쪽 기준으로 필터해도 안전. 전 구간 풀스캔 회피.
        List<Integer> dbYears = normalizedYears.stream()
                .filter(y -> !LEGACY_EXAM_COUNT.containsKey(y))
                .toList();

        Map<String, Integer> dbCounts = Map.of();
        Map<String, Integer> dbOneDayCounts = Map.of();
        if (!dbYears.isEmpty()) {
            String from = dbYears.get(0) + "-01-01";
            String to = dbYears.get(dbYears.size() - 1) + "-12-31";
            dbCounts = countsByMonth(repository.findTotalExamCountMonthly(from, to));
            dbOneDayCounts = countsByMonth(repository.findOneDayExamCountMonthly(from, to));
        }

        LinkedHashMap<String, ProcedureExamMonthlyItem> map =
                MonthlyBuckets.initialize(normalizedYears, this::emptyMonthlyItem);

        for (Map.Entry<String, ProcedureExamMonthlyItem> entry : map.entrySet()) {
            String key = entry.getKey();
            ProcedureExamMonthlyItem cur = entry.getValue();
            int count = legacyExamCount(cur.getYear(), cur.getMonth())
                    .orElse(dbCounts.getOrDefault(key, 0));
            int oneDayCount = legacyOneDayExamCount(cur.getYear(), cur.getMonth())
                    .orElse(dbOneDayCounts.getOrDefault(key, 0));
            entry.setValue(ProcedureExamMonthlyItem.builder()
                    .year(cur.getYear())
                    .month(cur.getMonth())
                    .examCount(count)
                    .oneDayExamCount(oneDayCount)
                    .total(count)
                    .build());
        }

        return new ArrayList<>(map.values());
    }

    private Map<String, Integer> countsByMonth(List<Map<String, Object>> rows) {
        Map<String, Integer> counts = new HashMap<>();
        for (Map<String, Object> row : rows) {
            counts.put(MonthlyBuckets.key(toInt(row.get("yr")), toInt(row.get("mo"))), toInt(row.get("cnt")));
        }
        return counts;
    }

    private ProcedureExamMonthlyItem emptyMonthlyItem(int year, int month) {
        return ProcedureExamMonthlyItem.builder()
                .year(year)
                .month(month)
                .examCount(0)
                .oneDayExamCount(0)
                .total(0)
                .build();
    }

    private Optional<Integer> legacyExamCount(int year, int month) {
        int[] values = LEGACY_EXAM_COUNT.get(year);
        if (values == null || month < 1 || month > values.length) {
            return Optional.empty();
        }
        return Optional.of(values[month - 1]);
    }

    private Optional<Integer> legacyOneDayExamCount(int year, int month) {
        int[] values = LEGACY_ONE_DAY_EXAM_COUNT.get(year);
        if (values == null || month < 1 || month > values.length) {
            return Optional.empty();
        }
        return Optional.of(values[month - 1]);
    }
}
