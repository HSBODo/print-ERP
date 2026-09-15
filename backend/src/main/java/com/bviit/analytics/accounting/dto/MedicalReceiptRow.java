package com.bviit.analytics.accounting.dto;

/**
 * 진료 수납 내역 1행 — 프런트 MedicalReceipt 계약. list_medical_receipt 컬럼과 1:1.
 * status 는 SQL 에서 '정상'/'취소' 로 이미 접혀 오고, closed 는 boolean 으로 변환된 뒤 온다.
 */
public record MedicalReceiptRow(
        String id,
        String receiptDate,
        String receiptType,
        String chartNo,
        int serialNo,
        String patientName,
        String insuranceType,
        String doctor,
        String receiptStaff,
        String receiptTime,
        String room,
        String revenueType,
        String status,
        boolean closed,
        long hundredCopay,
        long hundredUnpaid,
        long salaryTotal,
        long claimAmount,
        long copay,
        long nonCovered,
        long totalCopay,
        long welfareSupport,
        long disabledSupport,
        long supportAmount,
        long healthLivingExpense,
        long actualPaid,
        long outstanding,
        long discount,
        String discountReason,
        long card,
        long cash,
        long transfer,
        long refund,
        long outstandingOccurred,
        long outstandingRecovered,
        long outstandingCard,
        long outstandingCash,
        long outstandingTransfer,
        long refundOccurred,
        long cashReceipt
) {
}
