package com.bviit.analytics.accounting.dto;

/** 진료 매출 그래프 API 응답 1점 — 프런트 MedicalMonthlyMetric 과 같은 계약. */
public record MedicalMonthlyPoint(
        int year,
        int month,
        int count,
        long net,
        long claim,
        long salaryTotal,
        long nonCovered
) {
}
