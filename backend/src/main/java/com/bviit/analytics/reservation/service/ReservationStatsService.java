package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.repository.ReservationStatsRepository;
import com.bviit.analytics.common.util.MonthlyBuckets;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationStatsService implements ReservationStatsReader {

    private final ReservationStatsRepository repository;

    @Override
    @Transactional(readOnly = true)
    public List<ReservationMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Map<String, Object>> rows = repository.findMonthlyByType(years);

        Map<String, ReservationMonthlyItem> map = MonthlyBuckets.initialize(years, this::emptyMonthlyItem);

        for (Map<String, Object> row : rows) {
            int yr = toInt(row.get("yr"));
            int mo = toInt(row.get("mo"));
            String key = MonthlyBuckets.key(yr, mo);
            if (!map.containsKey(key)) continue;

            int surgery = toInt(row.get("surgery"));
            int outpatient = toInt(row.get("outpatient"));
            int dreamlens = toInt(row.get("dreamlens"));
            map.put(key, ReservationMonthlyItem.builder()
                    .year(yr).month(mo)
                    .surgery(surgery).outpatient(outpatient).dreamlens(dreamlens)
                    .total(surgery + outpatient + dreamlens)
                    .build());
        }

        return new java.util.ArrayList<>(map.values());
    }

    private ReservationMonthlyItem emptyMonthlyItem(int year, int month) {
        return ReservationMonthlyItem.builder()
                .year(year)
                .month(month)
                .surgery(0)
                .outpatient(0)
                .dreamlens(0)
                .total(0)
                .build();
    }
}
