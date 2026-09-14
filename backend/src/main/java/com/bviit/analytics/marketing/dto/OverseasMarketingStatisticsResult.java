package com.bviit.analytics.marketing.dto;

import java.util.List;

/** 해외마케팅 통계 화면에 필요한 연간 집계 묶음. granularity = month | week | day. */
public record OverseasMarketingStatisticsResult(
        int year,
        String granularity,
        List<OverseasMarketingBucketItem> buckets,
        List<OverseasMarketingCountryItem> topCountries
) {
}
