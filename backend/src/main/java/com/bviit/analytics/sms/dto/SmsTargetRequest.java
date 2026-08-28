package com.bviit.analytics.sms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * 발송 대상 수동 등록·수정 요청. 길이 제한은 SmsTarget 컬럼 길이와 같은 값을 쓴다.
 *
 * 필수는 차트번호와 연락처 둘뿐이다 — 이름은 동명이인이 있어 사람을 특정하지 못하고,
 * 발송에 실제로 필요한 값은 번호다. 나머지(이름·수술일·구분·수술명)는 차트번호 조회로 채워지며,
 * 수술일이 비면 등록 시점(오늘)로 저장한다.
 */
public record SmsTargetRequest(
        @NotBlank(message = "차트번호는 필수입니다.") @Size(max = 50) String chartNo,
        @Size(max = 100) String name,
        /** 01012345678 또는 010-1234-5678 — 저장 시 하이픈·공백 제거. */
        @NotBlank(message = "연락처는 필수입니다.")
        @Size(max = 20)
        @Pattern(regexp = "[0-9\\- ]+", message = "전화번호는 숫자와 하이픈만 입력할 수 있습니다.")
        String phone,
        LocalDate surgeryDate,
        @Size(max = 50) String surgeryType,
        /** 조회로 받은 수술 종류 코드. 안 담으면 수동 추가 행의 수술 종류가 빈다. */
        @Size(max = 20) String opType,
        @Size(max = 100) String surgeryR,
        @Size(max = 100) String surgeryL
) {
    /** 수술일 미입력 시 등록일로 대체한다(엔티티는 수술일이 필수 + 중복 판별 키). */
    public LocalDate surgeryDateOrToday() {
        return surgeryDate == null ? LocalDate.now() : surgeryDate;
    }

    public String nameOrEmpty() {
        return name == null ? "" : name.trim();
    }
}
