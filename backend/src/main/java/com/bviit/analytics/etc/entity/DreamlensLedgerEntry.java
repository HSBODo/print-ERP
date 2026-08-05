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

    /* ── 기본 정보 ──
     * 길이는 DreamlensLedgerRequest 의 @Size 와 반드시 같은 값을 쓴다.
     * 어긋나면 검증을 통과한 값이 DB 제약에 걸려 500/503 으로 튄다(원인을 알 수 없는 실패).
     */
    private LocalDate entryDate;
    @Column(length = 50) private String visitType;
    @Column(length = 50) private String customerNo;
    @Column(length = 100) private String customerName;
    @Column(length = 100) private String examiner;
    /** 시트의 '주소' 컬럼 — 구매·배송 구분과 실제 배송 주소가 섞여 있다(주소는 최대 76자 관측). */
    @Column(length = 200) private String purchaseType;

    /* ── R 렌즈 ── */
    @Column(length = 100) private String rLensName;
    @Column(length = 50) private String rBox;
    @Column(length = 100) private String rLensSpec;
    @Column(length = 50) private String rColor;
    private LocalDate rReturnDate;

    /* ── L 렌즈 ── */
    @Column(length = 100) private String lLensName;
    @Column(length = 50) private String lBox;
    @Column(length = 100) private String lLensSpec;
    @Column(length = 50) private String lColor;
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

    /**
     * 렌즈 정가(참고) — CRM 수납의 정가 합(PrcItmQty×PrcItmPrc).
     * 매출 버킷에 넣는 값은 실수납(PrcSumPrc)이라 할인·분납이 있으면 둘이 다르다
     * (예: 정가 30만 / 실수납 25만). 어느 쪽을 장부 기준으로 삼을지 판단할 수 있게 둘 다 수집한다.
     * totalRevenue() 합계에는 포함하지 않는다.
     */
    @Builder.Default private int lensListPrice = 0;

    /* ── 리콜 관리 (날짜·메모가 자유롭게 섞여 들어와 넉넉히 잡는다) ── */
    @Column(length = 200) private String nextReservation;
    @Column(length = 200) private String recall1;
    @Column(length = 200) private String recall1Reservation;
    @Column(length = 200) private String recall1Absent;
    @Column(length = 200) private String recall2;
    @Column(length = 200) private String recall2Reservation;
    @Column(length = 200) private String recall2Absent;
    @Column(length = 200) private String recall3;
    @Column(length = 200) private String recall3Reservation;
    @Column(length = 200) private String recall3Absent;

    /**
     * 행 출처 — 'AUTO'(배치 초안) / 'MANUAL'(사람 입력·수정).
     * null 은 source 컬럼 도입(2026-08-05) 이전 행이므로 MANUAL 로 간주한다.
     * 배치는 AUTO 행만 갱신하고, 사람이 한 번이라도 수정한 행(MANUAL)은 절대 덮지 않는다.
     */
    @Column(length = 10)
    private String source;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static final String SOURCE_AUTO = "AUTO";
    public static final String SOURCE_MANUAL = "MANUAL";

    /** 배치 초안 여부. null(구버전 행)은 사람 입력으로 간주한다. */
    public boolean isAutoDraft() {
        return SOURCE_AUTO.equals(source);
    }

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
        if (this.source == null) {
            this.source = SOURCE_MANUAL;   // 화면 입력·시더 등 배치 밖 경로는 전부 MANUAL
        }
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
        this.lensListPrice = src.lensListPrice;

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

        this.source = SOURCE_MANUAL;   // 사람이 손댄 순간 초안이 아니다 — 이후 배치가 덮지 않음
        this.updatedAt = now;
    }

    /**
     * 배치 재적재 시 AUTO 초안 행만 CRM 최신값으로 갱신한다.
     * 렌즈 물리 정보(스펙·색상·BOX·반납일)·리콜·구매구분은 CRM 에 없는 값이라 건드리지 않는다.
     * MANUAL 행에 호출하는 것은 버그다 — 호출측(ImportService)이 isAutoDraft() 로 거른다.
     */
    public void refreshDraft(String visitType, String customerName, String examiner,
                             int dlNew, int dlRepurchase, int mNew, int mRepurchase,
                             int hlNew, int hlRepurchase, int treatment, int lensListPrice,
                             LocalDateTime now) {
        this.visitType = visitType;
        this.customerName = customerName;
        this.examiner = examiner;
        this.dlNewRevenue = dlNew;
        this.dlRepurchaseRevenue = dlRepurchase;
        this.mNewRevenue = mNew;
        this.mRepurchaseRevenue = mRepurchase;
        this.hlNewRevenue = hlNew;
        this.hlRepurchaseRevenue = hlRepurchase;
        this.treatmentRevenue = treatment;
        this.lensListPrice = lensListPrice;
        this.updatedAt = now;
    }
}
