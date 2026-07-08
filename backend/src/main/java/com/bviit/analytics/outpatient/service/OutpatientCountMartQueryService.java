package com.bviit.analytics.outpatient.service;

import com.bviit.analytics.common.util.MonthlyBuckets;
import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;
import com.bviit.analytics.outpatient.repository.OutpatientCountStatsMartRepository;
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
 * 외래수 월별 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. OutpatientCountStatsReader 주입 시 자동 선택.
 * OutpatientCountStatsService와 동일한 계약 유지: 요청 연도 × 12개월 반환 (미저장 월은 null 채움).
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class OutpatientCountMartQueryService implements OutpatientCountStatsReader {

    private final OutpatientCountStatsMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<OutpatientCountMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();
        List<OutpatientCountMonthlyItem> martRows = martRepository.findMonthly(normalizedYears);
        Map<String, OutpatientCountMonthlyItem> byKey = martRows.stream()
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

    private OutpatientCountMonthlyItem emptyItem(int year, int month) {
        return OutpatientCountMonthlyItem.builder()
                .year(year)
                .month(month)
                .outpatientCount(null)
                .total(null)
                .build();
    }
}
