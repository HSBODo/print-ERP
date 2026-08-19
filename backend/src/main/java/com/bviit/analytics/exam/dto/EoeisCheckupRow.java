package com.bviit.analytics.exam.dto;

import java.time.LocalDate;

/** 아이리더 검사자·장비·일자별 집계 한 행. */
public record EoeisCheckupRow(
        String operatorName,
        String deviceName,
        LocalDate date,
        long count
) {
}
