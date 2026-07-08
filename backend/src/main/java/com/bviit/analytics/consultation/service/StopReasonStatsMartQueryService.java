package com.bviit.analytics.consultation.service;

import com.bviit.analytics.common.util.MonthlyBuckets;
import com.bviit.analytics.consultation.dto.StopReasonMonthlyItem;
import com.bviit.analytics.consultation.repository.ConsultationStatsMartRepository;
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
 * 검사 중단 사유 월별 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. StopReasonStatsReader 주입 시 자동 선택.
 * StopReasonStatsService와 동일한 계약 유지: 요청 연도 × 12개월 zero-fill.
 * 마트에 저장된 행만 있고 나머지는 0으로 채워 반환한다.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class StopReasonStatsMartQueryService implements StopReasonStatsReader {

    private final ConsultationStatsMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<StopReasonMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();
        List<StopReasonMonthlyItem> martRows = martRepository.findStopReasonMonthly(normalizedYears);
        Map<String, StopReasonMonthlyItem> byKey = martRows.stream()
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

    private StopReasonMonthlyItem emptyItem(int year, int month) {
        return StopReasonMonthlyItem.builder()
                .year(year)
                .month(month)
                .recommendX(0)
                .lensImpossible(0)
                .keratoconus(0)
                .avellino(0)
                .glaucoma(0)
                .visionChange(0)
                .other(0)
                .total(0)
                .build();
    }
}
