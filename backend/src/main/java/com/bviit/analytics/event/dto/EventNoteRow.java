package com.bviit.analytics.event.dto;

import com.bviit.analytics.event.entity.EventNote;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 이벤트 노트 응답 한 행 — 관리 화면 목록·단건·차트 오버레이가 같이 쓴다.
 * 날짜는 "2026-09-01", 일시는 "2026-09-23T15:00:00" (Asia/Seoul) 로 직렬화된다.
 * 삭제여부는 내보내지 않는다 — 삭제 행은 애초에 조회되지 않는다(@SQLRestriction).
 */
public record EventNoteRow(
        Long id,
        LocalDate eventDate,
        String summary,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        String createdBy,
        LocalDateTime createdAt,
        String updatedBy,
        LocalDateTime updatedAt
) {

    public static EventNoteRow from(EventNote note) {
        return new EventNoteRow(
                note.getId(),
                note.getEventDate(),
                note.getSummary(),
                note.getDescription(),
                note.getStartDate(),
                note.getEndDate(),
                note.getCreatedBy(),
                note.getCreatedAt(),
                note.getUpdatedBy(),
                note.getUpdatedAt()
        );
    }
}
