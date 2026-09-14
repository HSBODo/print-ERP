package com.bviit.analytics.marketing.dto;

/** 해외마케팅 기간 버킷(월/주차/일)별 유입·진료·매출 집계. */
public record OverseasMarketingBucketItem(
        String bucket,
        int inquiries,
        int exams,
        int surgeries,
        long examRevenue,
        long surgeryRevenue,
        long outpatientRevenue,
        long lensRevenue
) {
    public long totalRevenue() {
        return examRevenue + surgeryRevenue + outpatientRevenue + lensRevenue;
    }
}
