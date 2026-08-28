package com.bviit.analytics.sms.entity;

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
 * 문자 발송 대상 1행 — 수술이 끝난 환자.
 *
 * 마트(list_surgery)에서 자동 등록(AUTO)되거나 화면에서 수동 등록(MANUAL)된다.
 * 발송 여부는 status 하나로 결정한다:
 *   SENDABLE — 발송 가능. 발송 화면에서 선택·발송할 수 있다.
 *   CANCELED — 발송 취소(차단). 컴플레인·수신거부 등. 다시 SENDABLE 로 되돌리면 재발송 가능.
 *
 * 드림렌즈 장부와 같은 "사용자 원천 데이터"라 마트가 아니라 JPA 로 관리한다.
 */
@Entity
@Table(
        name = "sms_target",
        indexes = {
                @Index(name = "idx_sms_target_surgery_date", columnList = "surgeryDate"),
                @Index(name = "idx_sms_target_status", columnList = "status")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "ux_sms_target_chart_surgery", columnNames = {"chartNo", "surgeryDate"})
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SmsTarget {

    /**
     * 발송 가능 여부는 이 값 하나로 정한다.
     *   SENDABLE 발송 대기 — 아직 안 보냈거나 다시 보낼 수 있는 상태
     *   HOLD     발송 홀딩 — 보내면 안 되는 사람. 발송에서 자동으로 빠지고, 언제든 되돌릴 수 있다.
     * (구버전 값 'CANCELED' 도 홀딩으로 취급한다 — isSendable() 이 SENDABLE 만 참이라 자동으로 맞다.)
     */
    public static final String STATUS_SENDABLE = "SENDABLE";
    public static final String STATUS_HOLD = "HOLD";
    public static final String SOURCE_AUTO = "AUTO";
    public static final String SOURCE_MANUAL = "MANUAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 50, nullable = false) private String chartNo;
    @Column(length = 100, nullable = false) private String name;
    /** 하이픈·공백 없는 01012345678 형식으로 저장한다 — 솔라피 발송 형식 요건. */
    @Column(length = 20) private String phone;
    @Column(nullable = false) private LocalDate surgeryDate;
    /**
     * 발송 예정일의 기준일 — 보통은 수술일과 같다.
     *
     * 번호를 못 고친 채(또는 홀딩된 채) 예정일이 지나버리면 그 차수는 영영 안 나간다.
     * 그래서 번호를 고치거나 홀딩을 풀 때, 지나간 차수가 있으면 **기준일을 다시 깐다** —
     * 안 보낸 차수 중 가장 이른 것이 오늘이 되도록 밀어서(기준일 = 오늘 − 그 차수 오프셋)
     * 나머지 차수는 원래 간격을 그대로 유지한다.
     * null 은 이 컬럼 도입 이전 행이라 수술일과 같게 본다(scheduleBase()).
     */
    private LocalDate scheduleBase;
    /** 수술 구분 — list_surgery.surgery_category (시력교정/백내장 등). */
    @Column(length = 50) private String surgeryType;
    /**
     * 수술 종류 코드 — smilePro·icl·catMulti·reopLens 등. 마트의 surgery_op_type() 이 분류한 값이라
     * 수술 통계·채널 분석과 같은 기준이다. 화면 라벨(스마일프로 …)은 프론트가 붙인다.
     */
    @Column(length = 20) private String opType;
    /** 실제 수술명 우/좌 — list_surgery.surgery_r · surgery_l. 어떤 수술을 받았는지 보고 발송을 판단한다. */
    @Column(length = 100) private String surgeryR;
    @Column(length = 100) private String surgeryL;

    @Column(length = 20, nullable = false) private String status;
    @Column(length = 10, nullable = false) private String source;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public boolean isSendable() {
        return STATUS_SENDABLE.equals(status);
    }

    public void changeStatus(String newStatus, LocalDateTime now) {
        String normalized = "CANCELED".equals(newStatus) ? STATUS_HOLD : newStatus;
        if (!STATUS_SENDABLE.equals(normalized) && !STATUS_HOLD.equals(normalized)) {
            throw new IllegalArgumentException("허용되지 않는 상태입니다: " + newStatus);
        }
        this.status = normalized;
        this.updatedAt = now;
    }

    /**
     * 화면 수정 — <b>연락처만</b> 바꾼다. 사람이 손댄 행은 MANUAL 로 승격해 자동 등록이 덮지 않게 한다.
     *
     * 차트번호·수술일·수술 종류는 <b>CRM 이 정본</b>이라 여기서 바꾸지 않는다. 화면도 그 칸들을
     * 잠가 두지만, API 가 열려 있으면 언젠가 다른 경로로 들어와 마트와 어긋난 행이 생긴다.
     * 잘못 등록된 행은 고치는 게 아니라 홀딩하고 다시 등록하는 게 맞다.
     */
    public void changePhone(String phone, LocalDateTime now) {
        this.phone = normalizePhone(phone);
        this.source = SOURCE_MANUAL;
        this.updatedAt = now;
    }

    /**
     * 자동 등록(AUTO) 행을 CRM 최신값으로 갱신한다 — 연락처의 정답은 CRM 이라
     * 다시 불러오면 우리 쪽 값이 원천을 따라간다. 상태(발송 취소 여부)와 메모는 건드리지 않는다.
     * MANUAL 행에 호출하는 것은 버그다(호출측이 isAuto() 로 거른다).
     */
    public void refreshFromCrm(String name, String phone, String surgeryType, String opType,
                               String surgeryR, String surgeryL, LocalDateTime now) {
        this.name = name;
        this.phone = normalizePhone(phone);
        this.surgeryType = surgeryType;
        this.opType = opType;
        this.surgeryR = surgeryR;
        this.surgeryL = surgeryL;
        this.updatedAt = now;
    }

    /** 배치·불러오기가 갱신해도 되는 행인지. null(구버전 행)은 수동으로 간주해 덮지 않는다. */
    public boolean isAuto() {
        return SOURCE_AUTO.equals(source);
    }

    public void stampCreated(LocalDateTime now) {
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) this.status = STATUS_SENDABLE;
        if (this.source == null) this.source = SOURCE_MANUAL;
        if (this.scheduleBase == null) this.scheduleBase = this.surgeryDate;
        this.phone = normalizePhone(this.phone);
    }

    /** 예정일 계산의 기준일. 구버전 행(null)은 수술일로 본다. */
    public LocalDate scheduleBase() {
        return scheduleBase != null ? scheduleBase : surgeryDate;
    }

    /** 기준일이 수술일과 다르면 재조정된 행이다(화면에 표시해 왜 간격이 다른지 알린다). */
    public boolean isRebased() {
        return scheduleBase != null && !scheduleBase.equals(surgeryDate);
    }

    /** 지나간 차수를 되살리기 위해 기준일을 다시 깐다. 판단은 서비스가 한다(이력·차수 정보가 필요해서). */
    public void rebaseSchedule(LocalDate newBase, LocalDateTime now) {
        this.scheduleBase = newBase;
        this.updatedAt = now;
    }

    /** 솔라피 요건(01012345678) — 하이픈·공백 제거. null 은 빈 문자열로. */
    public static String normalizePhone(String raw) {
        if (raw == null) return "";
        return raw.replace("-", "").replace(" ", "").trim();
    }

    /**
     * 실제로 보낼 수 있는 번호인지 — 아니면 화면에서 '발송 불가'로 표시하고 발송에서 뺀다.
     *
     * 번호를 모를 때 자리만 채우는 관행이 있어 더미가 섞여 들어온다(2026-08 실측:
     * 01000000000 로 등록된 외국인 환자 2명). 형식만 맞다고 보내면 실패하거나 엉뚱한 곳으로 간다.
     *   - 휴대폰 형식(010/011/016/017/018/019 + 7~8자리)이어야 하고
     *   - 국번 뒤가 같은 숫자로만 채워진 값(00000000·11111111 …)은 더미로 본다.
     * 저장값이 아니라 판정이다 — CRM 에서 번호를 고치고 다시 불러오면 자동으로 풀린다.
     */
    public static boolean isValidPhone(String raw) {
        String phone = normalizePhone(raw);
        if (!phone.matches("01[016789]\\d{7,8}")) return false;
        return !phone.substring(3).matches("(\\d)\\1*");
    }

    public boolean hasValidPhone() {
        return isValidPhone(this.phone);
    }
}
