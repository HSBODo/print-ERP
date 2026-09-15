package com.bviit.analytics.accounting.dto;

/** 시력교정 매출 그래프 API 응답 1점 — 건수는 취소행 포함 행수, 금액은 취소 상계 순액. */
public record VisionMonthlyPoint(
        int year,
        int month,
        int count,
        long amount
) {
}
