package com.bviit.analytics.etc.dto;

import com.bviit.analytics.etc.entity.DreamlensLedgerEntry;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * 드림렌즈 장부 행 생성·수정 요청.
 *
 * ⚠️ JSON 키는 필드명 그대로여야 한다(@JsonAutoDetect 로 getter/setter 탐지를 끔).
 * mNewRevenue 의 접근자는 getMNewRevenue() 인데 Java Beans 규칙상 앞 두 글자가 모두
 * 대문자(MN)면 디캐피털라이즈가 적용되지 않아 기본 키가 "mnewRevenue" 가 된다.
 * 프론트 계약(mNewRevenue)과 어긋나므로 필드 기준 직렬화를 강제한다.
 */
@Getter
@Setter
@NoArgsConstructor
@JsonAutoDetect(
        fieldVisibility = JsonAutoDetect.Visibility.ANY,
        getterVisibility = JsonAutoDetect.Visibility.NONE,
        isGetterVisibility = JsonAutoDetect.Visibility.NONE,
        setterVisibility = JsonAutoDetect.Visibility.NONE
)
public class DreamlensLedgerRequest {

    @NotNull(message = "날짜는 필수입니다.")
    private LocalDate entryDate;
    private String visitType;
    private String customerNo;
    private String customerName;
    private String examiner;
    private String purchaseType;

    private String rLensName;
    private String rBox;
    private String rLensSpec;
    private String rColor;
    private LocalDate rReturnDate;

    private String lLensName;
    private String lBox;
    private String lLensSpec;
    private String lColor;
    private LocalDate lReturnDate;

    @PositiveOrZero private int dlNewRevenue;
    @PositiveOrZero private int dlRepurchaseRevenue;
    @PositiveOrZero private int mNewRevenue;
    @PositiveOrZero private int mRepurchaseRevenue;
    @PositiveOrZero private int hlNewRevenue;
    @PositiveOrZero private int hlRepurchaseRevenue;
    @PositiveOrZero private int depositRevenue;
    @PositiveOrZero private int fittingRevenue;
    @PositiveOrZero private int supplyRevenue;
    @PositiveOrZero private int treatmentRevenue;

    private String nextReservation;
    private String recall1;
    private String recall1Reservation;
    private String recall1Absent;
    private String recall2;
    private String recall2Reservation;
    private String recall2Absent;
    private String recall3;
    private String recall3Reservation;
    private String recall3Absent;

    /** 비영속 엔티티로 변환 — 신규 저장, 또는 기존 행의 updateFrom 소스로 쓴다. */
    public DreamlensLedgerEntry toEntity() {
        return DreamlensLedgerEntry.builder()
                .entryDate(entryDate)
                .visitType(visitType)
                .customerNo(customerNo)
                .customerName(customerName)
                .examiner(examiner)
                .purchaseType(purchaseType)
                .rLensName(rLensName).rBox(rBox).rLensSpec(rLensSpec).rColor(rColor).rReturnDate(rReturnDate)
                .lLensName(lLensName).lBox(lBox).lLensSpec(lLensSpec).lColor(lColor).lReturnDate(lReturnDate)
                .dlNewRevenue(dlNewRevenue)
                .dlRepurchaseRevenue(dlRepurchaseRevenue)
                .mNewRevenue(mNewRevenue)
                .mRepurchaseRevenue(mRepurchaseRevenue)
                .hlNewRevenue(hlNewRevenue)
                .hlRepurchaseRevenue(hlRepurchaseRevenue)
                .depositRevenue(depositRevenue)
                .fittingRevenue(fittingRevenue)
                .supplyRevenue(supplyRevenue)
                .treatmentRevenue(treatmentRevenue)
                .nextReservation(nextReservation)
                .recall1(recall1).recall1Reservation(recall1Reservation).recall1Absent(recall1Absent)
                .recall2(recall2).recall2Reservation(recall2Reservation).recall2Absent(recall2Absent)
                .recall3(recall3).recall3Reservation(recall3Reservation).recall3Absent(recall3Absent)
                .build();
    }
}
