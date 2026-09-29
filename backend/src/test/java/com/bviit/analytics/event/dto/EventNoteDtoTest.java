package com.bviit.analytics.event.dto;

import com.bviit.analytics.event.entity.EventNote;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class EventNoteDtoTest {

    private static final LocalDate SEP_1 = LocalDate.of(2026, 9, 1);

    private static ValidatorFactory factory;
    private static Validator validator;
    /**
     * Spring Boot 자동설정과 같게 — JavaTimeModule · 모르는 필드 무시(빌더 기본) · 날짜는 배열이 아닌 ISO 문자열
     * (WRITE_DATES_AS_TIMESTAMPS 는 빌더 기본값이 켜져 있어 Boot 처럼 직접 끈다).
     */
    private final ObjectMapper mapper = Jackson2ObjectMapperBuilder.json()
            .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .build();

    @BeforeAll
    static void setUpValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        factory.close();
    }

    @Test
    void 필수값만_있어도_통과한다() {
        assertThat(violatedFields(new EventNoteRequest(SEP_1, "추석 프로모션", null, null, null))).isEmpty();
    }

    @Test
    void 발생일과_요약이_없으면_필드_오류다() {
        assertThat(violatedFields(new EventNoteRequest(null, " ", null, null, null)))
                .containsExactlyInAnyOrder("eventDate", "summary");
    }

    @Test
    void 요약_100자_내용_5000자를_넘으면_오류다() {
        assertThat(violatedFields(new EventNoteRequest(SEP_1, "가".repeat(100), "나".repeat(5000), null, null))).isEmpty();
        assertThat(violatedFields(new EventNoteRequest(SEP_1, "가".repeat(101), "나".repeat(5001), null, null)))
                .containsExactlyInAnyOrder("summary", "description");
    }

    @Test
    void 기간은_시작일_발생일_종료일_순서여야_한다() {
        // 같은 날은 허용
        assertThat(violatedFields(new EventNoteRequest(SEP_1, "s", null, SEP_1, SEP_1))).isEmpty();
        assertThat(violatedFields(new EventNoteRequest(SEP_1, "s", null, SEP_1.minusDays(3), SEP_1.plusDays(3)))).isEmpty();
        // 시작일이 발생일보다 늦음 / 종료일이 발생일보다 이름
        assertThat(violatedFields(new EventNoteRequest(SEP_1, "s", null, SEP_1.plusDays(1), null))).containsExactly("periodValid");
        assertThat(violatedFields(new EventNoteRequest(SEP_1, "s", null, null, SEP_1.minusDays(1)))).containsExactly("periodValid");
    }

    @Test
    void 발생일이_없으면_기간_오류는_겹쳐_내지_않는다() {
        assertThat(violatedFields(new EventNoteRequest(null, "s", null, SEP_1, null))).containsExactly("eventDate");
    }

    @Test
    void 요청_JSON은_날짜_문자열을_받고_audit_필드는_무시한다() throws Exception {
        String json = """
                {"eventDate":"2026-09-01","summary":"추석","startDate":"2026-08-30",
                 "createdBy":"hacker","id":999,"periodValid":false}
                """;

        EventNoteRequest request = mapper.readValue(json, EventNoteRequest.class);
        EventNote entity = request.toEntity();

        assertThat(request.eventDate()).isEqualTo(SEP_1);
        assertThat(request.startDate()).isEqualTo(LocalDate.of(2026, 8, 30));
        assertThat(entity.getId()).isNull();
        assertThat(entity.getCreatedBy()).isNull(); // 저장 시 Auditing 이 채운다
    }

    @Test
    void 수정_요청은_기존_행의_값을_전부_교체한다() {
        EventNote note = new EventNoteRequest(SEP_1, "처음", "본문", SEP_1, SEP_1).toEntity();

        new EventNoteRequest(SEP_1.plusDays(1), "바뀜", null, null, null).applyTo(note);

        assertThat(note.getEventDate()).isEqualTo(SEP_1.plusDays(1));
        assertThat(note.getSummary()).isEqualTo("바뀜");
        assertThat(note.getDescription()).isNull();
        assertThat(note.getStartDate()).isNull();
        assertThat(note.getEndDate()).isNull();
    }

    @Test
    void 응답_JSON은_날짜를_YYYY_MM_DD_문자열로_내보낸다() {
        EventNote note = new EventNoteRequest(SEP_1, "추석", null, SEP_1.minusDays(2), null).toEntity();

        JsonNode json = mapper.valueToTree(EventNoteRow.from(note));

        assertThat(json.get("eventDate").asText()).isEqualTo("2026-09-01");
        assertThat(json.get("startDate").asText()).isEqualTo("2026-08-30");
        assertThat(json.get("summary").asText()).isEqualTo("추석");
        assertThat(json.has("deleteFlag")).isFalse();
    }

    private static Set<String> violatedFields(EventNoteRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }
}
