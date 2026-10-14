package com.bviit.analytics.event.entity;

import com.bviit.analytics.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;

/**
 * 이벤트 노트 — 특정 시점에 발생한 이벤트(프로모션·광고 집행·휴진·장애 등)를 기록한다.
 * 통계 차트 위에 마커로 겹쳐 "이 날 왜 튀었나"를 설명하는 용도. 설계: docs/event-note/design.md
 *
 * - eventDate 는 필수(차트 마커 기준점), startDate/endDate 는 기간형 이벤트일 때만 채운다.
 *   채울 때는 startDate ≤ eventDate ≤ endDate (DB CHECK event_note_period_ck 와 같은 규칙).
 * - 삭제는 소프트 삭제(deleteFlag). 삭제된 행은 @SQLRestriction 으로 모든 JPA 조회에서 빠진다.
 * - 길이는 요청 DTO 의 @Size 와 반드시 같게 맞춘다 — 어긋나면 검증을 통과한 값이 DB 제약에 걸려 500 이 난다.
 */
@Entity
@Table(
        name = "event_note",
        indexes = @Index(name = "idx_event_note_event_date", columnList = "event_date")
)
@SQLRestriction("delete_flag = false")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EventNote extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate; // 이벤트 발생일

    @Column(name = "summary", length = 100, nullable = false)
    private String summary; // 요약 (차트 툴팁·목록 제목)

    @Column(name = "description", columnDefinition = "text")
    private String description; // 내용

    @Column(name = "start_date")
    private LocalDate startDate; // 기간형 이벤트 시작 (선택)

    @Column(name = "end_date")
    private LocalDate endDate; // 기간형 이벤트 종료 (선택)

    // DEFAULT false — ddl-auto=update 가 기존 행이 있는 표에 NOT NULL 컬럼을 추가할 때 실패하지 않도록.
    @Column(name = "delete_flag", nullable = false, columnDefinition = "boolean default false")
    private boolean deleteFlag; // 삭제여부

    @Builder
    private EventNote(LocalDate eventDate, String summary, String description,
                      LocalDate startDate, LocalDate endDate) {
        this.eventDate = eventDate;
        this.summary = summary;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    /** 전체 필드 교체 (PUT). id·삭제여부·audit 값은 유지된다. */
    public void update(LocalDate eventDate, String summary, String description,
                       LocalDate startDate, LocalDate endDate) {
        this.eventDate = eventDate;
        this.summary = summary;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    /** 소프트 삭제. 이후 조회·수정은 @SQLRestriction 때문에 찾지 못한다(404). */
    public void delete() {
        this.deleteFlag = true;
    }
}
