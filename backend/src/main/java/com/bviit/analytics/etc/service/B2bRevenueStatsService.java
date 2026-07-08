package com.bviit.analytics.etc.service;

import com.bviit.analytics.etc.dto.B2bRevenueMonthlyItem;
import com.bviit.analytics.etc.repository.B2bRevenueStatsRepository;
import com.bviit.analytics.common.util.MonthlyBuckets;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class B2bRevenueStatsService implements B2bRevenueStatsReader {

    private final B2bRevenueStatsRepository repository;

    @Override
    @Transactional(readOnly = true)
    public List<B2bRevenueMonthlyItem> getMonthlyRevenue(List<Integer> years) {
        List<Map<String, Object>> rows = repository.findMonthlyRevenue(years);

        Map<String, B2bRevenueMonthlyItem> monthlyMap = MonthlyBuckets.initialize(years, this::emptyItem);

        for (Map<String, Object> row : rows) {
            int year = toInt(row.get("yr"));
            int month = toInt(row.get("mo"));
            String key = MonthlyBuckets.key(year, month);

            if (!monthlyMap.containsKey(key)) {
                continue;
            }

            monthlyMap.put(key, B2bRevenueMonthlyItem.builder()
                    .year(year)
                    .month(month)
                    .totalRevenue(toInt(row.get("totalRevenue")))
                    .caseCount(toInt(row.get("caseCount")))
                    .avgRevenuePerCase(toInt(row.get("avgRevenuePerCase")))
                    .visionRevenue(toInt(row.get("visionRevenue")))
                    .cataractRevenue(toInt(row.get("cataractRevenue")))
                    .visionCount(toInt(row.get("visionCount")))
                    .cataractCount(toInt(row.get("cataractCount")))
                    .designatedRevenue(toInt(row.get("designatedRevenue")))
                    .nonDesignatedRevenue(toInt(row.get("nonDesignatedRevenue")))
                    .designatedCount(toInt(row.get("designatedCount")))
                    .nonDesignatedCount(toInt(row.get("nonDesignatedCount")))
                    .opCost(toInt(row.get("opCost")))
                    .examCost(toInt(row.get("examCost")))
                    .dnaCost(toInt(row.get("dnaCost")))
                    .prpCost(toInt(row.get("prpCost")))
                    .etcCost(toInt(row.get("etcCost")))
                    .presbyopiaCost(toInt(row.get("presbyopiaCost")))
                    .hospitalSupplyCost(toInt(row.get("hospitalSupplyCost")))
                    .build());
        }

        return new ArrayList<>(monthlyMap.values());
    }

    private B2bRevenueMonthlyItem emptyItem(int year, int month) {
        return B2bRevenueMonthlyItem.builder()
                .year(year)
                .month(month)
                .totalRevenue(0)
                .caseCount(0)
                .avgRevenuePerCase(0)
                .visionRevenue(0)
                .cataractRevenue(0)
                .visionCount(0)
                .cataractCount(0)
                .designatedRevenue(0)
                .nonDesignatedRevenue(0)
                .designatedCount(0)
                .nonDesignatedCount(0)
                .opCost(0)
                .examCost(0)
                .dnaCost(0)
                .prpCost(0)
                .etcCost(0)
                .presbyopiaCost(0)
                .hospitalSupplyCost(0)
                .build();
    }

}
