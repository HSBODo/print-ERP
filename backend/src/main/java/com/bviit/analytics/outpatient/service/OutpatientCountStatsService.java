package com.bviit.analytics.outpatient.service;

import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;
import com.bviit.analytics.outpatient.repository.OutpatientCountStatsRepository;
import com.bviit.analytics.common.util.MonthlyBuckets;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

/**
 * 외래수 서비스.
 *
 *   - 2024~2025: 레거시 차트 확정값 고정.
 *   - 2026년 이후: 운영 DB 산출값(외래 예약 F + 내원/퇴원 I/H 행 수). mssql 프로파일에서만 계산.
 *
 * 레거시보다 월 4~9건 높게 나오는데, 레거시 출력 시점 이후 상태값 변경/세부구분 차이로 추정.
 */
@Service
@RequiredArgsConstructor
public class OutpatientCountStatsService implements OutpatientCountStatsReader {

    private static final Map<Integer, int[]> LEGACY_OUTPATIENT_COUNT = Map.of(
            2024, new int[] {5257, 5080, 4721, 4133, 4159, 4092, 4760, 4720, 3696, 4201, 3948, 4711},
            2025, new int[] {5389, 5389, 4933, 4349, 4451, 4000, 4275, 4354, 3332, 3724, 3639, 4086}
    );

    /** mssql·postgres-mart 프로파일에서만 주입됨. 없으면(H2 개발) 2026 이후는 데이터 없음(null). */
    private final Optional<OutpatientCountStatsRepository> repository;

    @Override
    public List<OutpatientCountMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();

        int minYear = normalizedYears.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = normalizedYears.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String from = minYear + "-01-01";
        String to = maxYear + "-12-31";

        Map<String, Integer> dbCounts = repository
                .map(repo -> countsByMonth(repo.findOutpatientCountMonthly(from, to)))
                .orElseGet(Map::of);

        List<OutpatientCountMonthlyItem> items = new ArrayList<>();
        for (Integer year : normalizedYears) {
            for (int month = 1; month <= 12; month++) {
                final int y = year;
                final int m = month;
                // 2024~2025는 레거시 확정값, 그 외 연도는 운영 DB 계산값(없으면 null)
                Integer count = legacyOutpatientCount(y, m)
                        .orElseGet(() -> dbCounts.get(MonthlyBuckets.key(y, m)));
                items.add(OutpatientCountMonthlyItem.builder()
                        .year(y)
                        .month(m)
                        .outpatientCount(count)
                        .total(count)
                        .build());
            }
        }

        return items;
    }

    private Map<String, Integer> countsByMonth(List<Map<String, Object>> rows) {
        Map<String, Integer> counts = new HashMap<>();
        for (Map<String, Object> row : rows) {
            counts.put(MonthlyBuckets.key(toInt(row.get("yr")), toInt(row.get("mo"))), toInt(row.get("cnt")));
        }
        return counts;
    }

    private Optional<Integer> legacyOutpatientCount(int year, int month) {
        int[] values = LEGACY_OUTPATIENT_COUNT.get(year);
        if (values == null || month < 1 || month > values.length) {
            return Optional.empty();
        }
        return Optional.of(values[month - 1]);
    }
}
