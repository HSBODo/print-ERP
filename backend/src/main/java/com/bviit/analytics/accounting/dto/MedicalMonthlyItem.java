package com.bviit.analytics.accounting.dto;

/**
 * 진료 매출 월별 집계 행 — mart_medical_receipt_monthly 1행. 배치가 의사랑 월합 조각(out/in/pt/pt80/gs)을 접어 만든다.
 *
 * net(실수납합계 · 레거시 공식) = copayDue + outstandingRecovered − outstandingNew − refund − healthLiving + refundOccurred
 */
public record MedicalMonthlyItem(
        int year,
        int month,
        int count,
        long copayDue,
        long claimAmount,
        long salaryTotal,
        long nonCovered,
        long discount,
        long outstandingRecovered,
        long refund,
        long outstandingNew,
        long refundOccurred,
        long healthLiving
) {
    public long net() {
        return copayDue + outstandingRecovered - outstandingNew - refund - healthLiving + refundOccurred;
    }
}
