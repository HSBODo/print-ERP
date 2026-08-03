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

    private static Map<String, Object> candidate(String chartNo, String reopDate, int autoIncluded) {
        return Map.of("chartNo", chartNo, "reopDate", reopDate, "autoIncluded", autoIncluded);
    }

    @Test
    void 저장_판정이_있으면_자동판정을_덮어쓴다() {
        List<ReoperationDecision> decisions = List.of(
                ReoperationDecision.builder()
                        .chartNo("12345").opDate(LocalDate.parse("2026-07-15"))
                        .isReoperation(true).build()
        );
        Map<String, Boolean> map = ReoperationOverlay.decisionMap(decisions);

        // 자동판정은 제외(0) 인데 저장 판정으로 포함(true) 이 됨
        assertThat(ReoperationOverlay.isReoperation(map, "12345", "2026-07-15",
                candidate("12345", "2026-07-15", 0))).isTrue();
    }

    @Test
    void 저장_판정이_없으면_자동판정을_그대로_쓴다() {
        Map<String, Boolean> map = ReoperationOverlay.decisionMap(List.of());

        assertThat(ReoperationOverlay.isReoperation(map, "12345", "2026-07-15",
                candidate("12345", "2026-07-15", 1))).isTrue();
        assertThat(ReoperationOverlay.isReoperation(map, "23456", "2026-07-15",
                candidate("23456", "2026-07-15", 0))).isFalse();
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
