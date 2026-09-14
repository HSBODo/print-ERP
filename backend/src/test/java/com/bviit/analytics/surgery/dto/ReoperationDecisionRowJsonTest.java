package com.bviit.analytics.surgery.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * boolean isReoperation 필드의 JSON 키 계약 회귀 방지.
 *
 * Lombok @Getter 가 만드는 isReoperation() 이 Jackson 의 boolean is-getter 규칙에 걸려
 * 기본 설정에서는 JSON 키가 "reoperation" 으로 잘린다(→ 프론트 저장 실패). 필드 기준
 * 직렬화로 강제한 @JsonAutoDetect 가 유지되어야 한다.
 */
class ReoperationDecisionRowJsonTest {

    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void isReoperation_필드는_그_이름_그대로_JSON_에_나간다() throws Exception {
        ReoperationDecisionRow row = ReoperationDecisionRow.builder()
                .id(1L)
                .chartNo("12345")
                .opDate(LocalDate.parse("2026-07-15"))
                .againR("remo")
                .againL("")
                .isReoperation(true)
                .build();

        JsonNode node = mapper.readTree(mapper.writeValueAsString(row));

        assertThat(node.has("isReoperation")).isTrue();
        assertThat(node.get("isReoperation").asBoolean()).isTrue();
        // is-getter 축약 형태로 나가면 안 된다 — 프론트 zod 스키마 계약 어긋남
        assertThat(node.has("reoperation")).isFalse();
    }
}
