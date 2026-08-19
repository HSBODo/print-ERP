package com.bviit.analytics.exam.dto;

import java.util.List;
import java.util.Map;

/** 피벗 화면 재료: 세밀 집계 행과 팀 공용 장비 점수. */
public record EoeisCheckupResult(
        List<EoeisCheckupRow> rows,
        Map<String, Integer> scores
) {
}
