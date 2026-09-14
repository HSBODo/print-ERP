package com.bviit.analytics.sms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 문자 발송 설정 — 그룹별 오프셋 + 차수별 발송 시각·메시지 종류.
 *
 * <p>V61 마이그레이션이 4행(SMILE·LASIK·LASEK·ICL) 을 seed 로 심는다.
 * ETC(백내장·재수술·미분류) 는 이 표에 없어 자동 발송 대상이 아니다.
 *
 * <p>관리자가 UI 그리드에서 편집하면 이 표가 갱신되고 캐시가 무효화된다.
 * 발송·조회 산식은 다음 요청부터 새 값을 반영한다 — 이미 발송된 로그(sms_send_log)는 그대로.
 *
 * <p>발송 시각·메시지 종류는 tier-level 이라 4행 모두 같은 값을 유지 — 서비스가 원자적으로 갱신한다.
 *
 * <p>표가 비어 있거나 특정 그룹 행이 없으면 {@code SurgeryGroup.offsets} 코드 기본값으로 회귀한다.
 */
@Entity
@Table(name = "sms_offset_config")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SmsOffsetConfig {

    /** 알림톡 — 정보성, 시간 제한 없음(정보통신망법 광고 규제 대상 아님). */
    public static final String KIND_NOTIFICATION = "NOTIFICATION";
    /** 광고톡 — 광고성, 21~08 발송 금지 → 서비스가 hour 8..20 강제. */
    public static final String KIND_AD = "AD";

    /**
     * ⚠️ 모든 컬럼에 @Column(name=...) 명시.
     * Hibernate 6 의 기본 SnakeCase 전략은 `tier1Kind` 를 `tier1kind` 로 변환(숫자와 대문자 사이
     * 언더스코어 X)해 V61 CREATE 의 `tier1_kind` 와 어긋난다. 명시적으로 이름을 고정해 어긋남을 방지.
     */

    /** SurgeryGroup.code() 와 정확히 같은 대문자 문자열 (SMILE·LASIK·LASEK·ICL). */
    @Id
    @Column(name = "group_code", length = 20)
    private String groupCode;

    @Column(name = "tier1_offset", nullable = false)
    private int tier1Offset;

    @Column(name = "tier2_offset", nullable = false)
    private int tier2Offset;

    @Column(name = "tier3_offset", nullable = false)
    private int tier3Offset;

    /**
     * 차수별 발송 시각 (HH:mm 정밀도). tier-level 이라 4행 동일값 유지.
     * TIME 컬럼 → java.time.LocalTime 매핑.
     */
    @Column(name = "tier1_time", nullable = false)
    private LocalTime tier1Time;

    @Column(name = "tier2_time", nullable = false)
    private LocalTime tier2Time;

    @Column(name = "tier3_time", nullable = false)
    private LocalTime tier3Time;

    /** 차수별 메시지 종류 — {@link #KIND_NOTIFICATION} / {@link #KIND_AD}. */
    @Column(name = "tier1_kind", nullable = false, length = 20)
    private String tier1Kind;

    @Column(name = "tier2_kind", nullable = false, length = 20)
    private String tier2Kind;

    @Column(name = "tier3_kind", nullable = false, length = 20)
    private String tier3Kind;

    @Column(name = "updated_by", length = 50)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * 오프셋 3개 + 시각 3개 + 종류 3개 함께 변경. 감사 필드는 서비스 계층이 채운다.
     * 유효성(범위·kind 별 시간 제한)은 서비스가 사전 검사한 뒤 호출한다.
     */
    public void update(int tier1, int tier2, int tier3,
                       LocalTime time1, LocalTime time2, LocalTime time3,
                       String kind1, String kind2, String kind3,
                       String actor, LocalDateTime now) {
        this.tier1Offset = tier1;
        this.tier2Offset = tier2;
        this.tier3Offset = tier3;
        this.tier1Time = time1;
        this.tier2Time = time2;
        this.tier3Time = time3;
        this.tier1Kind = kind1;
        this.tier2Kind = kind2;
        this.tier3Kind = kind3;
        this.updatedBy = actor;
        this.updatedAt = now;
    }

    /** 차수 인덱스(1..3) → 오프셋(일). 범위 밖은 가장 가까운 차수로 잘라 쓴다. */
    public int offsetOf(int tier) {
        return switch (Math.min(Math.max(tier, 1), 3)) {
            case 1 -> tier1Offset;
            case 2 -> tier2Offset;
            default -> tier3Offset;
        };
    }

    /** 차수 인덱스(1..3) → 발송 시각(LocalTime). */
    public LocalTime timeOf(int tier) {
        return switch (Math.min(Math.max(tier, 1), 3)) {
            case 1 -> tier1Time;
            case 2 -> tier2Time;
            default -> tier3Time;
        };
    }

    /** 차수 인덱스(1..3) → 메시지 종류. */
    public String kindOf(int tier) {
        return switch (Math.min(Math.max(tier, 1), 3)) {
            case 1 -> tier1Kind;
            case 2 -> tier2Kind;
            default -> tier3Kind;
        };
    }
}
