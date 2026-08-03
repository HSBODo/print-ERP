package com.bviit.analytics.etc.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 드림렌즈(D/L) 장부 1행 — 기존 스프레드시트 장부를 그대로 옮긴 입력 테이블.
 *
 * 시트 컬럼 대응(※ 시트의 '주소' 컬럼은 실제 주소가 아니라 구매·배송 구분이라
 * purchaseType 으로 이름을 바꿨다. 3차 리콜 구간은 시트 헤더가 '2차'로 잘못 복사돼
 * 있으나 여기서는 recall3* 로 바로잡았다).
 *
 * 마트(집계)가 아니라 사용자가 직접 입력하는 원천 데이터라 JPA 로 관리한다.
 */
@Entity
@Table(
        name = "dreamlens_ledger",
        indexes = {
                @Index(name = "idx_dreamlens_ledger_entry_date", columnList = "entryDate"),
                @Index(name = "idx_dreamlens_ledger_customer_no", columnList = "customerNo")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DreamlensLedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /* ── 기본 정보 ── */
    private LocalDate entryDate;
    private String visitType;
    private String customerNo;
    private String customerName;
    private String examiner;
    /** 시트의 '주소' 컬럼 — 본원 재고구매 / 본원배송(택배발송희망) / 대여렌즈 등. */
    @Column(length = 200)
    private String purchaseType;

    /* ── R 렌즈 ── */
    private String rLensName;
    private String rBox;
    private String rLensSpec;
    private String rColor;
    private LocalDate rReturnDate;

    /* ── L 렌즈 ── */
    private String lLensName;
    private String lBox;
    private String lLensSpec;
    private String lColor;
    private LocalDate lReturnDate;

    /* ── 매출 10종 ── */
    @Builder.Default private int dlNewRevenue = 0;
    @Builder.Default private int dlRepurchaseRevenue = 0;
    @Builder.Default private int mNewRevenue = 0;
    @Builder.Default private int mRepurchaseRevenue = 0;
    @Builder.Default private int hlNewRevenue = 0;
    @Builder.Default private int hlRepurchaseRevenue = 0;
    @Builder.Default private int depositRevenue = 0;
    @Builder.Default private int fittingRevenue = 0;
    @Builder.Default private int supplyRevenue = 0;
    @Builder.Default private int treatmentRevenue = 0;

    /* ── 리콜 관리 ── */
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

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** 매출 10종 합계 — 화면 합계행·집계에 쓰는 파생값(저장하지 않는다). */
    public int totalRevenue() {
        return dlNewRevenue + dlRepurchaseRevenue
                + mNewRevenue + mRepurchaseRevenue
                + hlNewRevenue + hlRepurchaseRevenue
                + depositRevenue + fittingRevenue + supplyRevenue + treatmentRevenue;
    }

    public void stampCreated(LocalDateTime now) {
        this.createdAt = now;
        this.updatedAt = now;
    }

    /**
     * 다른(비영속) 행의 값으로 이 행을 덮어쓴다. id·createdAt 은 유지.
     * @Setter 금지 규약을 지키면서 36개 컬럼 수정을 한 메서드로 처리한다.
     */
    public void updateFrom(DreamlensLedgerEntry src, LocalDateTime now) {
        this.entryDate = src.entryDate;
        this.visitType = src.visitType;
        this.customerNo = src.customerNo;
        this.customerName = src.customerName;
        this.examiner = src.examiner;
        this.purchaseType = src.purchaseType;

        this.rLensName = src.rLensName;
        this.rBox = src.rBox;
        this.rLensSpec = src.rLensSpec;
        this.rColor = src.rColor;
        this.rReturnDate = src.rReturnDate;

        this.lLensName = src.lLensName;
        this.lBox = src.lBox;
        this.lLensSpec = src.lLensSpec;
        this.lColor = src.lColor;
        this.lReturnDate = src.lReturnDate;

        this.dlNewRevenue = src.dlNewRevenue;
        this.dlRepurchaseRevenue = src.dlRepurchaseRevenue;
        this.mNewRevenue = src.mNewRevenue;
        this.mRepurchaseRevenue = src.mRepurchaseRevenue;
        this.hlNewRevenue = src.hlNewRevenue;
        this.hlRepurchaseRevenue = src.hlRepurchaseRevenue;
        this.depositRevenue = src.depositRevenue;
        this.fittingRevenue = src.fittingRevenue;
        this.supplyRevenue = src.supplyRevenue;
        this.treatmentRevenue = src.treatmentRevenue;

        this.nextReservation = src.nextReservation;
        this.recall1 = src.recall1;
        this.recall1Reservation = src.recall1Reservation;
        this.recall1Absent = src.recall1Absent;
        this.recall2 = src.recall2;
        this.recall2Reservation = src.recall2Reservation;
        this.recall2Absent = src.recall2Absent;
        this.recall3 = src.recall3;
        this.recall3Reservation = src.recall3Reservation;
        this.recall3Absent = src.recall3Absent;

        this.updatedAt = now;
    }
}
