package com.bviit.analytics.accounting.dto;

import java.util.Map;

/**
 * 시력교정 매출 내역 1행 — 프런트 VisionReceipt 계약. list_vision_receipt 컬럼과 1:1.
 * status 는 '결제처리'/'결제취소'. itemAmounts 는 원본 JSONB 를 VisionItemCatalog.ITEMS 키의 맵으로 풀어 온다.
 */
public record VisionReceiptRow(
        String id,
        String receiptDate,
        String chartNo,
        String patientName,
        String customerGrade,
        String surgeryDate,
        String surgeon,
        String procedureRight,
        String procedureLeft,
        String counselor,
        String status,
        String paymentMethod,
        String cardCompany,
        String acquirer,
        String paymentMode,
        String category,
        String productName,
        String registeredBy,
        String registeredAt,
        String paymentMemo,
        long amount,
        long taxable,
        long exempt,
        Map<String, Long> itemAmounts
) {
}
