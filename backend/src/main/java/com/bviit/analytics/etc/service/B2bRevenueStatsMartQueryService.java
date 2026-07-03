package com.bviit.analytics.etc.service;

import com.bviit.analytics.common.util.MonthlyBuckets;
import com.bviit.analytics.etc.dto.B2bRevenueMonthlyItem;
import com.bviit.analytics.etc.repository.B2bRevenueStatsMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * B2B 매출 월별 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. B2bRevenueStatsReader 주입 시 자동 선택.
 * 원본 서비스와 동일한 zero-fill 계약 유지 — 요청 연도 × 12개월 반환.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class B2bRevenueStatsMartQueryService implements B2bRevenueStatsReader {

    private final B2bRevenueStatsMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<B2bRevenueMonthlyItem> getMonthlyRevenue(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();
        List<B2bRevenueMonthlyItem> martRows = martRepository.findMonthly(normalizedYears);
        Map<String, B2bRevenueMonthlyItem> byKey = martRows.stream()
                .collect(Collectors.toMap(
                        item -> MonthlyBuckets.key(item.getYear(), item.getMonth()),
                        item -> item,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));

        return normalizedYears.stream()
                .flatMap(year -> java.util.stream.IntStream.rangeClosed(1, 12)
                        .mapToObj(month -> byKey.getOrDefault(
                                MonthlyBuckets.key(year, month),
                                emptyItem(year, month))))
                .toList();
    }

    private B2bRevenueMonthlyItem emptyItem(int year, int month) {
        return B2bRevenueMonthlyItem.builder()
                .year(year).month(month)
                .totalRevenue(0).caseCount(0).avgRevenuePerCase(0)
                .visionRevenue(0).cataractRevenue(0).visionCount(0).cataractCount(0)
                .designatedRevenue(0).nonDesignatedRevenue(0).designatedCount(0).nonDesignatedCount(0)
                .opCost(0).examCost(0).dnaCost(0).prpCost(0).etcCost(0)
                .presbyopiaCost(0).hospitalSupplyCost(0)
                .build();
    }
}
