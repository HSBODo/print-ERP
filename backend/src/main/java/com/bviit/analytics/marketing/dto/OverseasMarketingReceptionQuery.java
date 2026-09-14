package com.bviit.analytics.marketing.dto;

/** 해외마케팅 접수리스트 조회 조건. */
public record OverseasMarketingReceptionQuery(
        String from,
        String to,
        String dateType,
        boolean dateEnabled,
        String status,
        String source,
        boolean unmatched
) {
}
