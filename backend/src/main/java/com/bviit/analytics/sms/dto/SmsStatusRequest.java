package com.bviit.analytics.sms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;

import java.util.List;

/**
 * 상태 일괄 변경 — 툴바의 [발송중지]/[홀딩 해제]가 쓴다.
 *   HOLD     발송 홀딩(차단). 선택한 사람은 발송에서 빠진다.
 *   SENDABLE 홀딩 해제 → 다시 발송 대기.
 */
public record SmsStatusRequest(
        @NotEmpty List<Long> targetIds,
        @NotBlank @Pattern(regexp = "SENDABLE|HOLD", message = "상태는 SENDABLE 또는 HOLD 만 가능합니다.")
        String value
) {
}
