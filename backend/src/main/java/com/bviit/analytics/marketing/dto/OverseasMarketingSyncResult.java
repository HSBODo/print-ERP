package com.bviit.analytics.marketing.dto;

/** Google Sheet 신규 접수 동기화 결과. */
public record OverseasMarketingSyncResult(
        int inserted,
        int skipped,
        int outOfRange,
        int failed,
        long elapsedMillis,
        String message
) {
}
