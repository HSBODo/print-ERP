package com.bviit.analytics.sms.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;
import java.util.List;

/**
 * 오프셋 원자적 편집 요청 — 4행 오프셋 + 3차수 시각·종류를 함께 보낸다.
 *
 * <p>PUT 은 항상 4행 전부를 받는다(그리드 UI 계약과 정합). 시각·종류는 tier-level 이라
 * 4행 모두 같은 값으로 갱신된다.
 *
 * <p>세부 유효성(그룹 화이트리스트·차수 순서·kind 별 시각 제한)은 서비스가 검사한다 —
 * Bean Validation 은 형식만 커버.
 */
public record SmsOffsetUpdateRequest(
        @NotEmpty
        @Size(min = 4, max = 4, message = "오프셋은 4그룹(SMILE·LASIK·LASEK·ICL) 전체를 함께 보낸다.")
        @Valid
        List<Row> rows,

        /** tier1 발송 시각 (HH:mm) — 4행 모두 같은 값으로 갱신. */
        @NotNull
        @JsonFormat(pattern = "HH:mm")
        LocalTime tier1Time,
        @NotNull @JsonFormat(pattern = "HH:mm") LocalTime tier2Time,
        @NotNull @JsonFormat(pattern = "HH:mm") LocalTime tier3Time,

        /** tier1 메시지 종류 — NOTIFICATION(알림톡) / AD(광고톡). */
        @NotBlank @Pattern(regexp = "NOTIFICATION|AD", message = "메시지 종류는 NOTIFICATION/AD.")
        String tier1Kind,
        @NotBlank @Pattern(regexp = "NOTIFICATION|AD") String tier2Kind,
        @NotBlank @Pattern(regexp = "NOTIFICATION|AD") String tier3Kind
) {
    public record Row(
            @NotBlank String groupCode,
            @Min(0) @Max(30) int tier1Offset,
            @Min(0) @Max(30) int tier2Offset,
            @Min(0) @Max(30) int tier3Offset
    ) {}
}
