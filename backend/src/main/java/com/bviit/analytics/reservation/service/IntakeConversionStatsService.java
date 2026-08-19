package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.IntakeConversionMonthlyItem;
import com.bviit.analytics.reservation.repository.IntakeConversionStatsRepository;
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
@Profile("postgres-mart")
@RequiredArgsConstructor
public class IntakeConversionStatsService {

    private final IntakeConversionStatsRepository repository;

    /**
     * 연도별 월간 유입(검사예약) 건수.
     * 빈 달은 0으로 채운다.
     */
    @Transactional(readOnly = true)
    public List<IntakeConversionMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Map<String, Object>> rows = repository.findMonthlyStats(years);

        Map<String, IntakeConversionMonthlyItem> map = MonthlyBuckets.initialize(years, this::emptyMonthlyItem);

        for (Map<String, Object> row : rows) {
            int year = toInt(row.get("yr"));
            int month = toInt(row.get("mo"));
            String key = MonthlyBuckets.key(year, month);
            if (!map.containsKey(key)) {
                continue;
            }

            int incall = toInt(row.get("incall"));
            int outcall = toInt(row.get("outcall"));
            int kakao = toInt(row.get("kakao"));
            int naver = toInt(row.get("naver"));
            int homepage = toInt(row.get("homepage"));

            map.put(key, IntakeConversionMonthlyItem.builder()
                    .year(year)
                    .month(month)
                    .incall(incall)
                    .outcall(outcall)
                    .kakao(kakao)
                    .naver(naver)
                    .homepage(homepage)
                    .total(incall + outcall + kakao + naver + homepage)
                    .build());
        }

        return new ArrayList<>(map.values());
    }

    private IntakeConversionMonthlyItem emptyMonthlyItem(int year, int month) {
        return IntakeConversionMonthlyItem.builder()
                .year(year)
                .month(month)
                .incall(0)
                .outcall(0)
                .kakao(0)
                .naver(0)
                .homepage(0)
                .total(0)
                .build();
    }
}
