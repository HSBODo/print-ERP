package com.bviit.analytics.sms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;

import java.util.List;

/** 발송 실행 요청 — 선택한 대상들에게 템플릿 1종을 지정 채널로 보낸다. */
public record SmsSendRequest(
        @NotEmpty List<Long> targetIds,
        @NotBlank String templateCode,
        @NotBlank @Pattern(regexp = "ALIMTALK|SMS", message = "채널은 ALIMTALK 또는 SMS 만 가능합니다.") String channel
) {
}
