package com.bviit.analytics.accounting.service;

import com.bviit.analytics.accounting.dto.AccountingStatus;
import com.bviit.analytics.accounting.dto.MedicalMonthlyPoint;
import com.bviit.analytics.accounting.dto.MedicalReceiptRow;
import com.bviit.analytics.accounting.dto.VisionMonthlyPoint;
import com.bviit.analytics.accounting.dto.VisionReceiptRow;

import java.util.List;

/**
 * 회계 화면 읽기 계약 — 컨트롤러는 Optional 로 주입받아 마트 프로파일이 꺼져 있으면 503 을 낸다.
 * 구현은 마트 하나(AccountingMartQueryService). MSSQL 직결 폴백은 두지 않는다(화면은 마트만 읽는다).
 */
public interface AccountingReader {

    /** 진료 수납 내역 행. */
    List<MedicalReceiptRow> getMedicalReceipts(String from, String to);

    /** 진료 매출 월별 — category: 전체 / 외래 / 입원 / 백내장. */
    List<MedicalMonthlyPoint> getMedicalMonthly(List<Integer> years, String category);

    /** 시력교정 매출 내역 행. */
    List<VisionReceiptRow> getVisionReceipts(String from, String to);

    List<VisionMonthlyPoint> getVisionMonthly(List<Integer> years);

    AccountingStatus getStatus();
}
