package com.bviit.analytics.reservation.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * GET /api/stats/reservation 응답.
 * 프론트 Zod 스키마(frontend/src/api/stats.ts)와 1:1 매칭.
 *
 * 프론트 client.ts는 응답 body를 그대로 파싱하므로
 * ApiResponse 래퍼 없이 { data, meta } 형태로 직접 반환.
 */
@Getter
@Builder
public class ReservationStatsResponse {

    private final Data data;
    private final Meta meta;

    @Getter
    @Builder
    public static class Data {
        private final Summary summary;
        private final List<DailyTrend> dailyTrend;
        private final List<SourceBreakdown> sourceBreakdown;
        private final List<HourlyDistribution> hourlyDistribution;
    }

    @Getter
    @Builder
    public static class Summary {
        private final int totalReservations;
        private final double reservationChangeRate;
        private final int completedExaminations;
        private final double examinationConversionRate;
        private final int cancellations;
        private final double cancellationRate;
        private final int walkInReservations;
        private final double walkInShareRate;
    }

    @Getter
    @Builder
    public static class DailyTrend {
        private final String date;
        private final int reservations;
        private final int examinations;
        private final int cancellations;
    }

    @Getter
    @Builder
    public static class SourceBreakdown {
        private final String source;
        private final String label;
        private final int count;
    }

    @Getter
    @Builder
    public static class HourlyDistribution {
        private final String slot;
        private final int count;
    }

    @Getter
    @Builder
    public static class Meta {
        private final String from;
        private final String to;
    }
}
