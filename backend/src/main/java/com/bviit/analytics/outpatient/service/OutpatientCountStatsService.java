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
 * 외래수 서비스 — MSSQL 라이브 조회 (외래 예약 F + 내원/퇴원 I/H 행 수).
 *
 * 24·25 확정값은 mart(V9__legacy_seed.sql)가 유일 원천이며, postgres-mart 프로파일에서는
 * OutpatientCountMartQueryService(@Primary)가 mart를 직접 조회한다. 이 서비스는 배치 잡의
 * MSSQL 소스 리더로만 사용(2026+ 값). 24·25는 OutpatientMartJob에서 min-year 가드로 write 차단.
 *
 * MSSQL 라이브값은 레거시 대비 월 4~9건 높게 나오는데, 레거시 출력 시점 이후 상태값 변경/세부구분
 * 차이로 추정. 이 때문에 24·25는 mart 확정치를 유지하고 라이브 재계산을 허용하지 않는다.
 */
@Service
@RequiredArgsConstructor
public class OutpatientCountStatsService implements OutpatientCountStatsReader {

    /** mssql·postgres-mart 프로파일에서만 주입됨. 없으면(H2 개발) 데이터 없음(null). */
    private final Optional<OutpatientCountStatsRepository> repository;

    @Override
    public List<OutpatientCountMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();
        if (normalizedYears.isEmpty()) {
            return new ArrayList<>();
        }

        int minYear = normalizedYears.get(0);
        int maxYear = normalizedYears.get(normalizedYears.size() - 1);
        String from = minYear + "-01-01";
        String to = maxYear + "-12-31";

        Map<String, Integer> dbCounts = repository
                .map(repo -> countsByMonth(repo.findOutpatientCountMonthly(from, to)))
                .orElseGet(Map::of);

        List<OutpatientCountMonthlyItem> items = new ArrayList<>();
        for (Integer year : normalizedYears) {
            for (int month = 1; month <= 12; month++) {
                Integer count = dbCounts.get(MonthlyBuckets.key(year, month));
                items.add(OutpatientCountMonthlyItem.builder()
                        .year(year)
                        .month(month)
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
}
