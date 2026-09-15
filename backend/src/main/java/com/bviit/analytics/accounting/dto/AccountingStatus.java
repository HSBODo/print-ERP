package com.bviit.analytics.accounting.dto;

/**
 * 회계 마트 적재 현황 — 화면 "데이터 기준 YYYY-MM-DD · from~to" 표기용. 아직 적재 전이면 null.
 */
public record AccountingStatus(
        String medicalFrom,
        String medicalTo,
        String medicalLoadedAt,
        Integer medicalMonthlyFromYear,
        String visionFrom,
        String visionTo,
        String visionLoadedAt
) {
}
