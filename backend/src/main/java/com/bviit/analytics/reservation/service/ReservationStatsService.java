package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.dto.ReservationStatsResponse;
import com.bviit.analytics.reservation.repository.ReservationStatsRepository;
import com.bviit.analytics.common.util.MonthlyBuckets;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import static com.bviit.analytics.common.util.NumberUtils.roundToOneDecimal;
import static com.bviit.analytics.common.util.NumberUtils.toInt;

@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class ReservationStatsService implements ReservationStatsReader {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private static final Map<String, String> SOURCE_LABELS = Map.of(
            "phone", "전화",
            "naver", "네이버",
            "kakao", "카카오톡",
            "walkIn", "당일예약",
            "referral", "기타"
    );

    private final ReservationStatsRepository repository;

    @Transactional(readOnly = true)
    public ReservationStatsResponse getStats(LocalDate from, LocalDate to) {
        String fromStr = from.format(DATE_FMT);
        String toStr = to.format(DATE_FMT);

        // 이전 동일 기간 계산 (변화율용)
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        LocalDate prevTo = from.minusDays(1);
        LocalDate prevFrom = prevTo.minusDays(days - 1);

        Map<String, Object> current = repository.findSummary(fromStr, toStr);
        Map<String, Object> prev = repository.findPrevSummary(
                prevFrom.format(DATE_FMT), prevTo.format(DATE_FMT));

        ReservationStatsResponse.Summary summary = buildSummary(current, prev);

        List<ReservationStatsResponse.DailyTrend> dailyTrend =
                repository.findDailyTrend(fromStr, toStr).stream()
                        .map(this::toDailyTrend)
                        .toList();

        List<ReservationStatsResponse.SourceBreakdown> sourceBreakdown =
                repository.findSourceBreakdown(fromStr, toStr).stream()
                        .map(this::toSourceBreakdown)
                        .toList();

        List<ReservationStatsResponse.HourlyDistribution> hourlyDistribution =
                repository.findHourlyDistribution(fromStr, toStr).stream()
                        .map(this::toHourlyDistribution)
                        .toList();

        return ReservationStatsResponse.builder()
                .data(ReservationStatsResponse.Data.builder()
                        .summary(summary)
                        .dailyTrend(dailyTrend)
                        .sourceBreakdown(sourceBreakdown)
                        .hourlyDistribution(hourlyDistribution)
                        .build())
                .meta(ReservationStatsResponse.Meta.builder()
                        .from(fromStr)
                        .to(toStr)
                        .mock(false)
                        .build())
                .build();
    }

    private ReservationStatsResponse.Summary buildSummary(
            Map<String, Object> current, Map<String, Object> prev) {
        int total = toInt(current.get("totalReservations"));
        int exams = toInt(current.get("completedExaminations"));
        int cancels = toInt(current.get("cancellations"));
        int walkIns = toInt(current.get("walkInReservations"));
        int prevTotal = toInt(prev.get("totalReservations"));

        double changeRate = prevTotal > 0
                ? roundToOneDecimal((total - prevTotal) * 100.0 / prevTotal)
                : 0.0;
        double examRate = total > 0 ? roundToOneDecimal(exams * 100.0 / total) : 0.0;
        double cancelRate = total > 0 ? roundToOneDecimal(cancels * 100.0 / total) : 0.0;
        double walkInRate = total > 0 ? roundToOneDecimal(walkIns * 100.0 / total) : 0.0;

        return ReservationStatsResponse.Summary.builder()
                .totalReservations(total)
                .reservationChangeRate(changeRate)
                .completedExaminations(exams)
                .examinationConversionRate(examRate)
                .cancellations(cancels)
                .cancellationRate(cancelRate)
                .walkInReservations(walkIns)
                .walkInShareRate(walkInRate)
                .build();
    }

    private ReservationStatsResponse.DailyTrend toDailyTrend(Map<String, Object> row) {
        return ReservationStatsResponse.DailyTrend.builder()
                .date(String.valueOf(row.get("date")))
                .reservations(toInt(row.get("reservations")))
                .examinations(toInt(row.get("examinations")))
                .cancellations(toInt(row.get("cancellations")))
                .build();
    }

    private ReservationStatsResponse.SourceBreakdown toSourceBreakdown(Map<String, Object> row) {
        String source = String.valueOf(row.get("source"));
        return ReservationStatsResponse.SourceBreakdown.builder()
                .source(source)
                .label(SOURCE_LABELS.getOrDefault(source, source))
                .count(toInt(row.get("count")))
                .build();
    }

    private ReservationStatsResponse.HourlyDistribution toHourlyDistribution(Map<String, Object> row) {
        return ReservationStatsResponse.HourlyDistribution.builder()
                .slot(String.valueOf(row.get("slot")))
                .count(toInt(row.get("count")))
                .build();
    }

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
