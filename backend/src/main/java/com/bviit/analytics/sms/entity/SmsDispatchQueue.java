package com.bviit.analytics.sms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 문자 발송 큐 1행 — 언제 어떤 차수를 보낼지 예약. Import 시 대상×3차수로 심어두고,
 * 5분 폴러(SmsDispatchJob) 가 도래분을 뽑아 실제 발송으로 옮긴다.
 *
 * <p>왜 별도 표인가 — {@code sms_send_log} 는 사후 이력이라 "언제 나갈 예정인지" 를
 * 표현하지 못한다. 큐를 두면 재시도·홀딩 취소·오프셋 변경 재계산이 SQL 로 자연스럽다.
 *
 * <p>상태 라이프사이클 — {@link #STATUS_PENDING} → PROCESSING → RECEIVED → DONE / FAILED / CANCELED.
 * RECEIVED 는 솔라피가 접수한 뒤 도달 확인을 기다리는 중간 상태다. 웹훅/sync 가 결과를
 * 실어 오면 DONE(도달) 또는 FAILED(도달 실패) 로 굳는다. 자세한 전이 규칙은 V62 DDL 참조.
 */
@Entity
@Table(name = "sms_dispatch_queue")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SmsDispatchQueue {

    /** 발송 대기 — scheduled_at 도래하면 폴러가 잡는다. */
    public static final String STATUS_PENDING = "PENDING";
    /** 폴러가 FOR UPDATE SKIP LOCKED 로 잡은 상태. 실제 발송 시도 중. */
    public static final String STATUS_PROCESSING = "PROCESSING";
    /**
     * 솔라피 접수 성공. 도달 확인(웹훅·sync) 을 기다리는 중간 상태.
     * 이미 발송된 차수(idempotent SKIP) 도 여기로 취급 — 도달 여부는 send_log 가 말해준다.
     */
    public static final String STATUS_RECEIVED = "RECEIVED";
    /** 단말 도달 확인됨(웹훅 또는 sync 가 send_log SUCCESS 로 굳힌 뒤 이곳도 굳음). terminal. */
    public static final String STATUS_DONE = "DONE";
    /** max_attempts 도달까지 실패. 관리자 재실행 API 로만 되살아남. */
    public static final String STATUS_FAILED = "FAILED";
    /** 홀딩·수신거부·번호무효 등 재개 불가 사유. 재시도 대상 아님. */
    public static final String STATUS_CANCELED = "CANCELED";

    /** 알림톡 — 시간 제한 없음. */
    public static final String KIND_NOTIFICATION = "NOTIFICATION";
    /** 광고톡 — 정보통신망법상 21~08 발송 금지, 폴러가 8..20 강제. */
    public static final String KIND_AD = "AD";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ⚠️ 모든 컬럼에 @Column(name=...) 명시 — 다른 SMS 엔티티와 같은 이유(Hibernate 6 SnakeCase 어긋남 방지).
    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(name = "template_code", length = 20, nullable = false)
    private String templateCode;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Column(name = "kind", length = 20, nullable = false)
    private String kind;

    @Column(name = "status", length = 20, nullable = false)
    private String status;

    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private int attemptCount = 0;

    @Column(name = "last_error", length = 500)
    private String lastError;

    @Column(name = "picked_at")
    private LocalDateTime pickedAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** 폴러가 잡을 때 — PENDING → PROCESSING 전이. picked_at 도 함께 찍는다. */
    public void markProcessing(LocalDateTime now) {
        this.status = STATUS_PROCESSING;
        this.pickedAt = now;
        this.updatedAt = now;
    }

    /**
     * 솔라피 접수 성공 — PROCESSING → RECEIVED. 도달 확인은 웹훅/sync 가 채운다.
     * processed_at 은 접수 시각으로 찍는다(daily-limit 은 발송 시도 기준으로 센다).
     */
    public void markReceived(LocalDateTime now) {
        this.status = STATUS_RECEIVED;
        this.processedAt = now;
        this.updatedAt = now;
    }

    /**
     * 단말 도달 확인됨 — RECEIVED → DONE. 웹훅 SINGLE-REPORT 나 sync 가 send_log 를 SUCCESS 로
     * 마킹한 뒤 부른다. 이미 DONE 이면 no-op (중복 이벤트 방어).
     */
    public void markDelivered(LocalDateTime now) {
        if (STATUS_DONE.equals(this.status)) return;
        this.status = STATUS_DONE;
        this.processedAt = now;
        this.updatedAt = now;
    }

    /**
     * 도달 실패 확정 — RECEIVED → FAILED. 웹훅/sync 가 도달 실패 코드를 실어 왔을 때.
     * max_attempts 재시도와 무관하게 즉시 굳힌다 (통신사 최종 실패 코드).
     */
    public void markDeliveryFailed(String reason, LocalDateTime now) {
        this.status = STATUS_FAILED;
        this.lastError = truncate(reason);
        this.processedAt = now;
        this.updatedAt = now;
    }

    /** 실패 결과 반영 — max 미만이면 PENDING 으로 되돌려 다음 폴링에서 재시도. */
    public void markFailedAttempt(String errorMessage, int maxAttempts, LocalDateTime now) {
        this.attemptCount++;
        this.lastError = truncate(errorMessage);
        if (this.attemptCount >= maxAttempts) {
            this.status = STATUS_FAILED;
            this.processedAt = now;
        } else {
            this.status = STATUS_PENDING;
        }
        this.updatedAt = now;
    }

    /** 홀딩·수신거부·번호무효 등 재시도 무의미한 SKIP. terminal. */
    public void markCanceled(String reason, LocalDateTime now) {
        this.status = STATUS_CANCELED;
        this.lastError = truncate(reason);
        this.processedAt = now;
        this.updatedAt = now;
    }

    /**
     * 관리자 재실행 — FAILED/CANCELED 를 PENDING 으로 되돌린다. attempt_count 도 리셋.
     *
     * <p>{@code scheduled_at} 규칙: 원 예정이 아직 안 지났으면 그대로(원 스케줄에 발송),
     * 이미 지났으면 {@code now} 로 밀어 다음 폴링에서 즉시 발송한다. 이렇게 해야
     * "이미 시간이 지난 실패 건" 이 다음 폴링에서 바로 재시도되고, "예정 시각 전에 실수로
     * 취소한 건" 은 원 스케줄을 존중한다. 표시된 예정 시각과 실제 시도 시각이 일치.
     */
    public void reset(LocalDateTime now) {
        this.status = STATUS_PENDING;
        this.attemptCount = 0;
        this.lastError = null;
        this.pickedAt = null;
        this.processedAt = null;
        if (this.scheduledAt == null || this.scheduledAt.isBefore(now)) {
            this.scheduledAt = now;
        }
        this.updatedAt = now;
    }

    /**
     * 오프셋·시각 편집 · 홀딩 해제 재등록 시 PENDING 큐 재계산. 상태·재시도 카운트는 유지.
     *
     * <p>{@link #reset(LocalDateTime)} 과 같은 규칙: 새 예정이 미래면 그대로,
     * 과거면 {@code now} 로 밀어 "다음 폴링에서 즉시 발송" 을 표시와 일치시킨다.
     * 예: 발송중지 해제 시 원 예정이 오늘 10시였는데 15시에 해제 → 15시로 밀림 → 즉시 발송.
     */
    public void reschedule(LocalDateTime newScheduledAt, String newKind, LocalDateTime now) {
        this.scheduledAt = (newScheduledAt == null || newScheduledAt.isBefore(now)) ? now : newScheduledAt;
        this.kind = newKind;
        this.updatedAt = now;
    }

    public void stampCreated(LocalDateTime now) {
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) this.status = STATUS_PENDING;
    }

    private static String truncate(String s) {
        if (s == null) return null;
        return s.length() > 500 ? s.substring(0, 500) : s;
    }
}
