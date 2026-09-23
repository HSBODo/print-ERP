package com.bviit.analytics.event.dto;

import com.bviit.analytics.event.entity.EventNote;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * 이벤트 노트 등록·수정 요청 (POST · PUT 공용, PUT 은 전체 필드 교체).
 *
 * audit 필드(created_*·updated_*)·id·삭제여부는 받지 않는다 — 서버(JPA Auditing)가 채운다.
 * 길이는 EventNote 의 @Column(length) 과 같은 값이어야 한다. 어긋나면 검증을 통과한 값이
 * DB 제약에 걸려 500 으로 튀어 사용자가 원인을 알 수 없다.
 */
public record EventNoteRequest(
        @NotNull(message = "발생일은 필수입니다.")
        LocalDate eventDate,

        @NotBlank(message = "요약은 필수입니다.")
        @Size(max = 100, message = "요약은 {max}자를 넘을 수 없습니다.")
        String summary,

        @Size(max = 5000, message = "내용은 {max}자를 넘을 수 없습니다.")
        String description,

        LocalDate startDate,
        LocalDate endDate
) {

    /**
     * 기간형 이벤트면 시작일 ≤ 발생일 ≤ 종료일 — V69 의 CHECK(event_note_period_ck) 와 같은 규칙.
     * 발생일이 비어 있으면 @NotNull 이 따로 잡으므로 여기서는 통과시킨다.
     * GlobalExceptionHandler 가 필드 오류만 모으므로 클래스 수준 제약 대신 프로퍼티(periodValid)로 둔다.
     */
    @JsonIgnore
    @AssertTrue(message = "시작일 ≤ 발생일 ≤ 종료일 이어야 합니다.")
    public boolean isPeriodValid() {
        if (eventDate == null) {
            return true;
        }
        boolean startOk = startDate == null || !startDate.isAfter(eventDate);
        boolean endOk = endDate == null || !eventDate.isAfter(endDate);
        return startOk && endOk;
    }

    public EventNote toEntity() {
        return EventNote.builder()
                .eventDate(eventDate)
                .summary(summary)
                .description(description)
                .startDate(startDate)
                .endDate(endDate)
                .build();
    }

    /** PUT — 기존 행을 이 요청 값으로 교체한다. */
    public void applyTo(EventNote note) {
        note.update(eventDate, summary, description, startDate, endDate);
    }
}
