package com.bviit.analytics.etc.dto;

import com.bviit.analytics.etc.entity.DreamlensLedgerEntry;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

/**
 * 드림렌즈 장부 행 응답.
 *
 * ⚠️ JSON 키는 필드명 그대로여야 한다 — 사유는 {@link DreamlensLedgerRequest} 주석 참고.
 */
@Getter
@Builder
@JsonAutoDetect(
        fieldVisibility = JsonAutoDetect.Visibility.ANY,
        getterVisibility = JsonAutoDetect.Visibility.NONE,
        isGetterVisibility = JsonAutoDetect.Visibility.NONE
)
public class DreamlensLedgerRow {

    private final Long id;

    private final LocalDate entryDate;
    private final String visitType;
    private final String customerNo;
    private final String customerName;
    private final String examiner;
    private final String purchaseType;

    private final String rLensName;
    private final String rBox;
    private final String rLensSpec;
    private final String rColor;
    private final LocalDate rReturnDate;

    private final String lLensName;
    private final String lBox;
    private final String lLensSpec;
    private final String lColor;
    private final LocalDate lReturnDate;

    private final int dlNewRevenue;
    private final int dlRepurchaseRevenue;
    private final int mNewRevenue;
    private final int mRepurchaseRevenue;
    private final int hlNewRevenue;
    private final int hlRepurchaseRevenue;
    private final int depositRevenue;
    private final int fittingRevenue;
    private final int supplyRevenue;
    private final int treatmentRevenue;
    /** 렌즈 정가(참고) — 실수납(매출 버킷)과 비교용. totalRevenue 에 미포함. */
    private final int lensListPrice;
    /** 매출 10종 합계(서버 계산) — 화면 합계 표시용. */
    private final int totalRevenue;

    /** 'AUTO'(배치 초안) / 'MANUAL'(사람 입력·수정) — 화면 뱃지용. 구버전 행(null)은 MANUAL 로 내려간다. */
    private final String source;

    private final String nextReservation;
    private final String recall1;
    private final String recall1Reservation;
    private final String recall1Absent;
    private final String recall2;
    private final String recall2Reservation;
    private final String recall2Absent;
    private final String recall3;
    private final String recall3Reservation;
    private final String recall3Absent;

    public static DreamlensLedgerRow from(DreamlensLedgerEntry e) {
        return DreamlensLedgerRow.builder()
                .id(e.getId())
                .entryDate(e.getEntryDate())
                .visitType(e.getVisitType())
                .customerNo(e.getCustomerNo())
                .customerName(e.getCustomerName())
                .examiner(e.getExaminer())
                .purchaseType(e.getPurchaseType())
                .rLensName(e.getRLensName()).rBox(e.getRBox()).rLensSpec(e.getRLensSpec())
                .rColor(e.getRColor()).rReturnDate(e.getRReturnDate())
                .lLensName(e.getLLensName()).lBox(e.getLBox()).lLensSpec(e.getLLensSpec())
                .lColor(e.getLColor()).lReturnDate(e.getLReturnDate())
                .dlNewRevenue(e.getDlNewRevenue())
                .dlRepurchaseRevenue(e.getDlRepurchaseRevenue())
                .mNewRevenue(e.getMNewRevenue())
                .mRepurchaseRevenue(e.getMRepurchaseRevenue())
                .hlNewRevenue(e.getHlNewRevenue())
                .hlRepurchaseRevenue(e.getHlRepurchaseRevenue())
                .depositRevenue(e.getDepositRevenue())
                .fittingRevenue(e.getFittingRevenue())
                .supplyRevenue(e.getSupplyRevenue())
                .treatmentRevenue(e.getTreatmentRevenue())
                .lensListPrice(e.getLensListPrice())
                .totalRevenue(e.totalRevenue())
                .source(e.getSource() == null ? DreamlensLedgerEntry.SOURCE_MANUAL : e.getSource())
                .nextReservation(e.getNextReservation())
                .recall1(e.getRecall1()).recall1Reservation(e.getRecall1Reservation()).recall1Absent(e.getRecall1Absent())
                .recall2(e.getRecall2()).recall2Reservation(e.getRecall2Reservation()).recall2Absent(e.getRecall2Absent())
                .recall3(e.getRecall3()).recall3Reservation(e.getRecall3Reservation()).recall3Absent(e.getRecall3Absent())
                .build();
    }
}
