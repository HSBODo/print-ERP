package com.bviit.analytics.sms.entity;

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
 * 발송 이력 1행 — 발송 시도마다 누적한다(재발송도 새 행). 지우지 않는다.
 *
 * 솔라피 메시지 조회 API(getMessageList)와 대사할 수 있도록 조회 키를 같이 담는다:
 *   solapiMessageId(M4V…) · solapiGroupId(G4V…) · messageType(SMS/LMS/ATA 등) ·
 *   fromNumber/toNumber · statusCode. 나중에 도달 여부를 이 키로 재조회해 갱신할 수 있다.
 */
@Entity
@Table(
        name = "sms_send_log",
        indexes = {
                @Index(name = "idx_sms_send_log_target", columnList = "targetId"),
                @Index(name = "idx_sms_send_log_sent_at", columnList = "sentAt")
        }
        // 멱등키(target_id, template_code, cycle_base WHERE status<>'FAILED')는 부분 인덱스라
        // JPA 로 표현할 수 없다 — V52__sms_management.sql 이 만든다.
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SmsSendLog {

    /**
     * 발송 상태 — **접수와 도달을 구분한다.**
     *   PENDING  접수는 됐지만 아직 도달 확인 전 (화면 '대기')
     *   SUCCESS  단말 도달 확인됨 (화면 '완료') — deliveredAt 이 채워진다
     *   FAILED   접수 거부 또는 도달 실패 (화면 '실패')
     * 접수 성공을 곧바로 완료로 적으면 "보냈는데 안 갔다"를 못 잡는다.
     */
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_SUCCESS = "SUCCESS";
    public static final String STATUS_FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false) private Long targetId;
    /** 대상이 지워져도 이력만으로 읽히도록 스냅샷을 함께 둔다. */
    @Column(length = 50) private String chartNo;
    @Column(length = 100) private String name;

    @Column(length = 20, nullable = false) private String templateCode;
    @Column(length = 100) private String templateLabel;
    /** 요청 채널 — ALIMTALK / SMS. 알림톡 실패 시 문자 대체발송되면 실제 타입과 다를 수 있다. */
    @Column(length = 20, nullable = false) private String requestedChannel;

    /* ── 솔라피 조회 대응 컬럼 (getMessageList 검색 키) ── */
    @Column(length = 20) private String fromNumber;
    @Column(length = 20) private String toNumber;
    /** 솔라피 실제 메시지 타입 — SMS/LMS/MMS/ATA(알림톡)/CTA 등. */
    @Column(length = 20) private String messageType;
    @Column(length = 40) private String solapiGroupId;
    @Column(length = 40) private String solapiMessageId;
    @Column(length = 20) private String statusCode;

    @Column(length = 20, nullable = false) private String status;
    @Column(length = 500) private String failReason;

    /**
     * 이 발송이 속한 사이클 = 발송 시점의 대상 기준일(SmsTarget.scheduleBase).
     * (targetId, templateCode, cycleBase) 가 멱등키다 — 같은 사이클의 같은 차수는 한 번만 나간다.
     * 홀딩 해제·연락처 수정으로 기준일이 다시 깔리면 새 사이클이라 재발송이 허용된다.
     */
    private LocalDate cycleBase;

    /** 단말 도달 시각(솔라피 dateReceived). 비어 있으면 아직 도달 확인 전이다. */
    private LocalDateTime deliveredAt;
    /** 대체발송 — 알림톡으로 요청했는데 문자로 나갔는지(솔라피 replacement). */
    @Column(nullable = false) @Builder.Default private boolean replacement = false;

    @Column(nullable = false) private LocalDateTime sentAt;
    @Column(length = 50) private String sentBy;

    /**
     * 접수 결과를 기록한다 — 발송 의도(PENDING)를 먼저 저장한 뒤, 실제 발송이 끝나고 부른다.
     * 접수 성공은 아직 도달이 아니라서 PENDING 을 유지하고, 도달 여부는 동기화가 채운다.
     */
    public void applyAcceptResult(String messageType, String groupId, String messageId,
                                  String statusCode, String status, String failReason) {
        if (messageType != null && !messageType.isBlank()) this.messageType = messageType;
        if (groupId != null && !groupId.isBlank()) this.solapiGroupId = groupId;
        if (messageId != null && !messageId.isBlank()) this.solapiMessageId = messageId;
        if (statusCode != null && !statusCode.isBlank()) this.statusCode = statusCode;
        this.status = status;
        this.failReason = failReason;
    }

    /**
     * 솔라피 메시지 조회 결과를 반영한다 — 접수 시점에는 알 수 없는 값들이다.
     * 실제 타입(대체발송이면 SMS/LMS 로 바뀐다)·상태코드·도달시각·대체발송 여부.
     */
    public void applyDeliveryResult(String messageType, String statusCode, String status,
                                    LocalDateTime deliveredAt, boolean replacement, String failReason) {
        if (messageType != null && !messageType.isBlank()) this.messageType = messageType;
        if (statusCode != null && !statusCode.isBlank()) this.statusCode = statusCode;
        this.status = status;
        this.deliveredAt = deliveredAt;
        this.replacement = replacement;
        if (failReason != null && !failReason.isBlank()) this.failReason = failReason;
    }
}
