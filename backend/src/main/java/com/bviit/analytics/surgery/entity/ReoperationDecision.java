package com.bviit.analytics.surgery.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 재수술 확정 판정 — 재수술 검토 모달에서 담당자가 저장한 최종 결정.
 *
 * 자동판정(find-reoperation-candidates.sql)은 후보 제안일 뿐이고,
 * 이 테이블에 저장된 값이 재수술 여부의 정답이다. 저장이 없는 (chartNo, opDate)는
 * "아직 검토 안 됨" 이라 자동판정을 기본값으로 쓴다.
 */
@Entity
@Table(
        name = "reoperation_decision",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_reoperation_decision_chart_opdate",
                columnNames = {"chartNo", "opDate"}
        ),
        indexes = {
                @Index(name = "idx_reoperation_decision_op_date", columnList = "opDate")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ReoperationDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String chartNo;

    @Column(nullable = false)
    private LocalDate opDate;

    /** true = 재수술로 확정, false = 재수술 아님으로 확정. */
    @Column(nullable = false)
    private boolean isReoperation;

    @Column(length = 500)
    private String memo;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** 마지막으로 저장한 사용자(로그인 아이디). 감사용, 화면 노출은 하지 않는다. */
    @Column(length = 100)
    private String updatedBy;

    public void stampCreated(LocalDateTime now, String user) {
        this.createdAt = now;
        this.updatedAt = now;
        this.updatedBy = user;
    }

    /** 판정만 갱신 — id/createdAt/chartNo/opDate 는 유지. */
    public void applyDecision(boolean isReoperation, String memo, LocalDateTime now, String user) {
        this.isReoperation = isReoperation;
        this.memo = memo;
        this.updatedAt = now;
        this.updatedBy = user;
    }
}
