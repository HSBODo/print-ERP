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

import static com.bviit.analytics.common.util.NumberUtils.toInt;

/**
 * 시술별 검사 건수("검사수") 서비스 — MSSQL 라이브 조회.
 *
 * 검사수 = EXAM 행수 + Cataract_Exam 세션수.
 *
 * 24·25 확정값은 mart(V9__legacy_seed.sql)가 유일 원천이며, postgres-mart 프로파일에서는
 * ProcedureExamMartQueryService(@Primary)가 mart를 직접 조회한다. 이 서비스는 배치 잡의
 * MSSQL 소스 리더로만 사용(2026+ 값). 24·25는 ExamMartJob에서 min-year 가드로 write 차단.
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class ProcedureExamStatsService implements ProcedureExamStatsReader {

    private final ProcedureExamStatsRepository repository;

    @Override
    @Transactional(readOnly = true)
    public List<ProcedureExamMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();
        if (normalizedYears.isEmpty()) {
            return new ArrayList<>();
        }

        String from = normalizedYears.get(0) + "-01-01";
        String to = normalizedYears.get(normalizedYears.size() - 1) + "-12-31";
        Map<String, Integer> dbCounts = countsByMonth(repository.findTotalExamCountMonthly(from, to));
        Map<String, Integer> dbOneDayCounts = countsByMonth(repository.findOneDayExamCountMonthly(from, to));

        LinkedHashMap<String, ProcedureExamMonthlyItem> map =
                MonthlyBuckets.initialize(normalizedYears, this::emptyMonthlyItem);

        for (Map.Entry<String, ProcedureExamMonthlyItem> entry : map.entrySet()) {
            String key = entry.getKey();
            ProcedureExamMonthlyItem cur = entry.getValue();
            int count = dbCounts.getOrDefault(key, 0);
            int oneDayCount = dbOneDayCounts.getOrDefault(key, 0);
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
}
