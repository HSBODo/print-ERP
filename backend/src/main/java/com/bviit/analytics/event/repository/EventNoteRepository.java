package com.bviit.analytics.event.repository;

import com.bviit.analytics.event.entity.EventNote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

/**
 * 이벤트 노트 CRUD 리포지토리. 삭제 행(delete_flag)은 엔티티의 @SQLRestriction 이 모든 조회에서 뺀다.
 *
 * 기간 조회는 event_date 하나만 본다 (from ≤ event_date ≤ to, 양 끝 포함).
 * start_date/end_date 는 조회 조건에 쓰지 않는다 — 차트에서 구간을 그릴 때만 쓰는 표시용 값이다.
 * 정렬은 메서드 이름에 고정하므로 Pageable 에 sort 를 넣지 않는다.
 */
public interface EventNoteRepository extends JpaRepository<EventNote, Long> {

    /** 관리 화면 — 기간 필터 없음. 최신 발생일이 위로, 같은 날이면 나중에 입력한 행이 위로. */
    Page<EventNote> findAllByOrderByEventDateDescIdDesc(Pageable pageable);

    /** 관리 화면 — 기간 필터. 정렬은 위와 같다. */
    Page<EventNote> findByEventDateBetweenOrderByEventDateDescIdDesc(LocalDate from, LocalDate to, Pageable pageable);

    /** 차트 — 기간 안의 전체 목록 (페이징 없음). x축 순서대로 오름차순. */
    List<EventNote> findByEventDateBetweenOrderByEventDateAscIdAsc(LocalDate from, LocalDate to);
}
