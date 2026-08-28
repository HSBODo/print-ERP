package com.bviit.analytics.sms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 문자 수신거부 — <b>사람 단위</b>로 한 번 등록하면 계속 막힌다.
 *
 * 홀딩만으로는 부족하다. 홀딩은 (차트번호 + 수술일) 행 하나에 걸리는데 자동 적재는
 * 새 수술이 생기면 새 행을 SENDABLE 로 만든다 — "그만 보내주세요"라고 한 환자가
 * <b>다음 수술 때 되살아난다.</b> 그 구멍을 이 표가 막는다.
 *
 * 매칭은 <b>번호</b>로 한다. 차트번호는 참고용이다 — 같은 사람이 차트를 새로 파도
 * 번호가 같으면 막히고, 데스크·전화·(나중에) 080 어느 경로로 들어와도 같은 키로 모인다.
 *
 * ⚠️ 보유기간이 지나도 지우지 않는다 — 지우면 다시 발송된다(기획서 12장 파기 예외).
 */
@Entity
@Table(
        name = "sms_opt_out",
        uniqueConstraints = @UniqueConstraint(name = "ux_sms_opt_out_phone", columnNames = "phone")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SmsOptOut {

    /** 화면에서 사람이 등록. */
    public static final String SOURCE_MANUAL = "MANUAL";
    /** 솔라피 080 수신거부 서비스에서 당겨온 값 — 연동하면 이 값으로 들어온다. */
    public static final String SOURCE_SOLAPI_080 = "SOLAPI_080";

    // ⚠️ 모든 컬럼에 @Column(name=...) 명시 — Hibernate naming strategy 어긋남 방지.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    /** 하이픈 없는 01012345678 — 대상(phone)과 같은 규칙으로 정규화해 저장한다. */
    @Column(name = "phone", length = 20, nullable = false)
    private String phone;

    @Column(name = "chart_no", length = 50)
    private String chartNo;

    @Column(name = "name", length = 100)
    private String name;

    @Column(name = "source", length = 20, nullable = false)
    private String source;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "created_by", length = 50)
    private String createdBy;

    public static SmsOptOut of(String phone, String chartNo, String name, String source,
                               String createdBy, LocalDateTime now) {
        return SmsOptOut.builder()
                .phone(SmsTarget.normalizePhone(phone))
                .chartNo(chartNo)
                .name(name)
                .source(source == null || source.isBlank() ? SOURCE_MANUAL : source)
                .createdBy(createdBy)
                .createdAt(now)
                .build();
    }
}
