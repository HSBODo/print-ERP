package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import com.bviit.analytics.reservation.repository.ReservationOverallStatsRepository;
import com.bviit.analytics.common.util.MonthlyBuckets;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

/**
 * 예약 종합(콜, 온라인) / 온라인 예약 — MSSQL 직결 소스.
 *
 * 배치({@code ReservationOverallMartJob})가 MSSQL 원천을 읽어 {@code mart_reservation_overall_monthly}
 * 에 upsert 하기 위해 사용한다. 컨트롤러 조회 흐름은 {@code ReservationOverallMartQueryService}
 * (postgres-mart @Primary)가 마트에서 읽기 때문에 여기로 오지 않는다.
 *
 * 24·25 확정값은 V12 seed 로 마트에 저장되어 있고 min-year 가드로 write 차단되므로,
 * 여기서는 별도의 LEGACY_* 하드코딩을 두지 않는다.
 *
 *   - 콜    = RESERVE_PATH CTI/CRM, B2B(군인)·재검·중복 예약 제외.
 *   - 온라인 = RESERVE_PATH ONLINE/APP(홈페이지) + NAVER(네이버). 카카오 미포함.
 *   - 종합  = 콜 + 온라인.
 *
 * ⚠️ 등록일(InsertedDateTime) 기준 집계. 미래월은 자연히 행이 없어 null.
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class ReservationOverallStatsService implements ReservationOverallStatsReader {

    private final ReservationOverallStatsRepository repository;

    @Override
    public List<ReservationOverallMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();

        int minYear = normalizedYears.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = normalizedYears.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String from = minYear + "-01-01";
        String to = maxYear + "-12-31 23:59:59";

        List<Map<String, Object>> rows = repository.findReservationOverallMonthly(from, to);
        Map<String, Integer> dbTotal = new HashMap<>();
        Map<String, Integer> dbOnline = new HashMap<>();
        Map<String, Integer> dbCall = new HashMap<>();
        for (Map<String, Object> row : rows) {
            String key = MonthlyBuckets.key(toInt(row.get("yr")), toInt(row.get("mo")));
            dbTotal.put(key, toInt(row.get("cnt")));
            dbOnline.put(key, toInt(row.get("online_cnt")));
            dbCall.put(key, toInt(row.get("call_cnt")));
        }

        YearMonth currentMonth = YearMonth.now();

        List<ReservationOverallMonthlyItem> items = new ArrayList<>();
        for (Integer year : normalizedYears) {
            for (int month = 1; month <= 12; month++) {
                final int y = year;
                final int m = month;
                final String key = MonthlyBuckets.key(y, m);
                final boolean future = YearMonth.of(y, m).isAfter(currentMonth);

                Integer total = future ? null : dbTotal.get(key);
                Integer online = future ? null : dbOnline.get(key);
                Integer call = future ? null : dbCall.get(key);

                items.add(ReservationOverallMonthlyItem.builder()
                        .year(y)
                        .month(m)
                        .reservations(total)
                        .online(online)
                        .call(call)
                        .total(total)
                        .build());
            }
        }

        return items;
    }
}
