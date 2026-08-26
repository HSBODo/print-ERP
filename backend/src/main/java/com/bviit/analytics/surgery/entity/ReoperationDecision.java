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
 * 자동판정(select-reoperation-candidates.sql)은 후보 제안일 뿐이고,
 * 이 테이블에 저장된 값이 재수술 여부의 정답이다.
 *
 * 유니크 키가 (chartNo, opDate, againR, againL) 인 이유:
 *   같은 사람·같은 날 서로 다른 시술명의 재수술이 별건으로 존재하는 케이스가 있다
 *   (예: 327701 2026-08-03 "remo+T-ARF" 와 "K-flex"). RE_OPERATION 원본에 표면
 *   PK 가 노출돼 있지 않아 시술명 조합을 식별자로 쓴다. againR/againL 은 candidates
 *   SQL 의 ISNULL(...) 로 항상 문자열(빈 문자열 포함) 이 들어온다.
 */
@Entity
@Table(
        name = "reoperation_decision",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_reoperation_decision_key",
                columnNames = {"chartNo", "opDate", "againR", "againL"}
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

    /** 우안 시술명(RE_OPERATION.AGAIN_R). 없으면 빈 문자열. */
    @Column(nullable = false, length = 200)
    private String againR;

    /** 좌안 시술명(RE_OPERATION.AGAIN_L). 없으면 빈 문자열. */
    @Column(nullable = false, length = 200)
    private String againL;

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
