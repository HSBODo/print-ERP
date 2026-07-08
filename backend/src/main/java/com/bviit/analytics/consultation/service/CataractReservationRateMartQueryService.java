package com.bviit.analytics.consultation.service;

import com.bviit.analytics.common.util.MonthlyBuckets;
import com.bviit.analytics.consultation.dto.CataractReservationRateItem;
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
 * 예약률(vision/cataract) 월별 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. CataractReservationRateReader 주입 시 자동 선택.
 * 원본 서비스와 동일한 zero-fill 계약 유지 — 요청 연도 × 12개월 반환.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class CataractReservationRateMartQueryService implements CataractReservationRateReader {

    private final ConsultationStatsMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CataractReservationRateItem> getMonthlyRates(List<Integer> years, String category) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();
        String normalizedCategory = "vision".equalsIgnoreCase(category) ? "vision" : "cataract";

        List<CataractReservationRateItem> martRows =
                martRepository.findReservationRateMonthly(normalizedYears, normalizedCategory);
        Map<String, CataractReservationRateItem> byKey = martRows.stream()
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

    private CataractReservationRateItem emptyItem(int year, int month) {
        return CataractReservationRateItem.builder()
                .year(year)
                .month(month)
                .examCount(0)
                .surgeryBookedCount(0)
                .reservationRate(0)
                .build();
    }
}
