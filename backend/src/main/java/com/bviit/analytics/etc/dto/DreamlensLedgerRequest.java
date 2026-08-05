package com.bviit.analytics.etc.dto;

import com.bviit.analytics.etc.entity.DreamlensLedgerEntry;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
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

    /* 길이는 DreamlensLedgerEntry 의 @Column(length) 과 같은 값이어야 한다.
     * 여기서 막지 않으면 DB 제약에 걸려 "데이터 조회에 실패했습니다"(503) 로 튀어
     * 사용자가 원인을 알 수 없다. 400 + 필드 메시지로 돌려주는 게 목적이다. */
    private static final String TOO_LONG = "{max}자를 넘을 수 없습니다.";

    @NotNull(message = "날짜는 필수입니다.")
    private LocalDate entryDate;
    @Size(max = 50, message = TOO_LONG) private String visitType;
    @Size(max = 50, message = TOO_LONG) private String customerNo;
    @Size(max = 100, message = TOO_LONG) private String customerName;
    @Size(max = 100, message = TOO_LONG) private String examiner;
    @Size(max = 200, message = TOO_LONG) private String purchaseType;

    @Size(max = 100, message = TOO_LONG) private String rLensName;
    @Size(max = 50, message = TOO_LONG) private String rBox;
    @Size(max = 100, message = TOO_LONG) private String rLensSpec;
    @Size(max = 50, message = TOO_LONG) private String rColor;
    private LocalDate rReturnDate;

    @Size(max = 100, message = TOO_LONG) private String lLensName;
    @Size(max = 50, message = TOO_LONG) private String lBox;
    @Size(max = 100, message = TOO_LONG) private String lLensSpec;
    @Size(max = 50, message = TOO_LONG) private String lColor;
    private LocalDate lReturnDate;

    private static final String NEGATIVE = "0원 이상이어야 합니다.";

    @PositiveOrZero(message = NEGATIVE) private int dlNewRevenue;
    @PositiveOrZero(message = NEGATIVE) private int dlRepurchaseRevenue;
    @PositiveOrZero(message = NEGATIVE) private int mNewRevenue;
    @PositiveOrZero(message = NEGATIVE) private int mRepurchaseRevenue;
    @PositiveOrZero(message = NEGATIVE) private int hlNewRevenue;
    @PositiveOrZero(message = NEGATIVE) private int hlRepurchaseRevenue;
    @PositiveOrZero(message = NEGATIVE) private int depositRevenue;
    @PositiveOrZero(message = NEGATIVE) private int fittingRevenue;
    @PositiveOrZero(message = NEGATIVE) private int supplyRevenue;
    @PositiveOrZero(message = NEGATIVE) private int treatmentRevenue;

    @Size(max = 200, message = TOO_LONG) private String nextReservation;
    @Size(max = 200, message = TOO_LONG) private String recall1;
    @Size(max = 200, message = TOO_LONG) private String recall1Reservation;
    @Size(max = 200, message = TOO_LONG) private String recall1Absent;
    @Size(max = 200, message = TOO_LONG) private String recall2;
    @Size(max = 200, message = TOO_LONG) private String recall2Reservation;
    @Size(max = 200, message = TOO_LONG) private String recall2Absent;
    @Size(max = 200, message = TOO_LONG) private String recall3;
    @Size(max = 200, message = TOO_LONG) private String recall3Reservation;
    @Size(max = 200, message = TOO_LONG) private String recall3Absent;

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
