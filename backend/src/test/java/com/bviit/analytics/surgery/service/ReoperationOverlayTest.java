package com.bviit.analytics.surgery.service;

import com.bviit.analytics.surgery.entity.ReoperationDecision;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 재수술 오버레이 유틸 — 시술명 패턴이 자바로 옮겨졌으므로(과거엔 3개 SQL에 흩어져 있었음)
 * 렌즈/레이저 분류를 잠근다. 저장 판정 우선 규칙도 함께 검증.
 */
class ReoperationOverlayTest {

    private static Map<String, Object> candidate(int autoIncluded) {
        return Map.of("autoIncluded", autoIncluded);
    }

    private static ReoperationDecision decision(String chartNo, String date, String againR, String againL, boolean isReop) {
        return ReoperationDecision.builder()
                .chartNo(chartNo).opDate(LocalDate.parse(date))
                .againR(againR).againL(againL)
                .isReoperation(isReop).build();
    }

    @Test
    void 저장_판정이_있으면_자동판정을_덮어쓴다() {
        Map<String, Boolean> map = ReoperationOverlay.decisionMap(List.of(
                decision("12345", "2026-07-15", "remo+T-ARF", "", true)
        ));

        // 자동판정은 제외(0) 인데 저장 판정으로 포함(true) 이 됨
        assertThat(ReoperationOverlay.isReoperation(map, "12345", "2026-07-15", "remo+T-ARF", "",
                candidate(0))).isTrue();
    }

    @Test
    void 저장_판정이_없으면_자동판정을_그대로_쓴다() {
        Map<String, Boolean> map = ReoperationOverlay.decisionMap(List.of());

        assertThat(ReoperationOverlay.isReoperation(map, "12345", "2026-07-15", "", "",
                candidate(1))).isTrue();
        assertThat(ReoperationOverlay.isReoperation(map, "23456", "2026-07-15", "", "",
                candidate(0))).isFalse();
    }

    @Test
    void 같은_사람_같은_날_다른_시술명은_각각_별도로_판정된다() {
        // 327701 2026-08-03 에 "remo+T-ARF" 와 "K-flex" 두 재수술이 별건으로 존재하는 케이스.
        Map<String, Boolean> map = ReoperationOverlay.decisionMap(List.of(
                decision("327701", "2026-08-03", "remo+T-ARF", "", true)
                // "K-flex" 는 저장되지 않은 상태 — 자동판정을 따라야 한다.
        ));

        assertThat(ReoperationOverlay.isReoperation(map, "327701", "2026-08-03", "remo+T-ARF", "",
                candidate(0))).as("저장 판정 true 가 자동판정 0 을 덮어쓴다").isTrue();
        assertThat(ReoperationOverlay.isReoperation(map, "327701", "2026-08-03", "K-flex", "",
                candidate(0))).as("K-flex 는 저장 없음 → 자동판정 0 그대로").isFalse();
        assertThat(ReoperationOverlay.isReoperation(map, "327701", "2026-08-03", "K-flex", "",
                candidate(1))).as("K-flex 는 저장 없음 → 자동판정 1 그대로").isTrue();
    }

    @Test
    void 렌즈_패턴이_시술명에_있으면_렌즈로_분류한다() {
        // 대표 12종 — SQL 상수 그대로 자바로 옮긴 것.
        assertThat(ReoperationOverlay.isLensCategory("ICL Removal", "")).isTrue();
        assertThat(ReoperationOverlay.isLensCategory("", "Lens Exch")).isTrue();
        assertThat(ReoperationOverlay.isLensCategory("EVO ICL", "")).isTrue();
        assertThat(ReoperationOverlay.isLensCategory("ARF", "")).isTrue();
        assertThat(ReoperationOverlay.isLensCategory("ART", "")).isTrue();
        assertThat(ReoperationOverlay.isLensCategory("ECHO Lens", "")).isTrue();
        assertThat(ReoperationOverlay.isLensCategory("GLAZE", "")).isTrue();
        assertThat(ReoperationOverlay.isLensCategory("precizon", "")).isTrue();
        assertThat(ReoperationOverlay.isLensCategory("Lisa", "")).isTrue();
        assertThat(ReoperationOverlay.isLensCategory("Gemetric", "")).isTrue();
        assertThat(ReoperationOverlay.isLensCategory("encla", "")).isTrue();
    }

    @Test
    void KPL_계열은_렌즈다() {
        // 유형별 집계에서 KPL·T-KPL 은 PIOL(렌즈) 그룹이라 재수술에서도 렌즈여야 한다.
        // 아래 시술명은 운영 RE_OPERATION 의 실제 값(2024-01~).
        assertThat(ReoperationOverlay.isLensCategory("KPL", "")).isTrue();
        assertThat(ReoperationOverlay.isLensCategory("", "Mono+KPL"))
                .as("Mono(모노비전)+KPL — 렌즈가 섞이면 렌즈").isTrue();
        assertThat(ReoperationOverlay.isLensCategory("", "Mono+KPL+(P)")).isTrue();
        assertThat(ReoperationOverlay.isLensCategory("", "repo+T-KPL"))
                .as("T-KPL 도 부분일치로 잡힌다").isTrue();
        assertThat(ReoperationOverlay.isLensCategory("Re-en+KPL", "")).isTrue();
        assertThat(ReoperationOverlay.isLensCategory("ENHANCE+KPL", ""))
                .as("ENHANCE(레이저)+KPL — 렌즈 우선").isTrue();
    }

    @Test
    void 매칭_없으면_레이저로_분류한다() {
        assertThat(ReoperationOverlay.isLensCategory("Enhance", "")).isFalse();
        assertThat(ReoperationOverlay.isLensCategory("Re-LASIK", "")).isFalse();
        assertThat(ReoperationOverlay.isLensCategory("", "")).isFalse();
    }

    @Test
    void 대소문자와_null_안전성() {
        assertThat(ReoperationOverlay.isLensCategory("icl", null)).isTrue();
        assertThat(ReoperationOverlay.isLensCategory(null, "EVO")).isTrue();
        assertThat(ReoperationOverlay.isLensCategory(null, null)).isFalse();
    }
}
