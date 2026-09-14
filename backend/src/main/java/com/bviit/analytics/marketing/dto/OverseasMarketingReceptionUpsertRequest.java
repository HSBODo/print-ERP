package com.bviit.analytics.marketing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 접수 행 수기 추가·수정 요청 — 시트 원본 컬럼만 받는다(CRM 파생값은 조회 시 재계산). */
public record OverseasMarketingReceptionUpsertRequest(
        @Size(max = 10) String inquiryDate,
        @NotBlank @Size(max = 100) String name,
        @Size(max = 100) String contact,
        @Size(max = 300) String email,
        @Size(max = 20) String gender,
        @Size(max = 30) String dob,
        @Size(max = 100) String nationality,
        @Size(max = 100) String ethnicity,
        @Size(max = 200) String occupation,
        @Size(max = 100) String contactLens,
        String medicalConditions,
        String medicationAllergy,
        @Size(max = 200) String departureSchedule,
        @Size(max = 200) String examDate,
        @Size(max = 200) String surgeryDate,
        @Size(max = 100) String surgeryCost,
        @Size(max = 100) String channel,
        @Size(max = 100) String onlineChannel,
        String remark
) {
}
