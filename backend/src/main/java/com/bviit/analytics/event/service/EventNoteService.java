package com.bviit.analytics.event.service;

import com.bviit.analytics.common.dto.PageResponse;
import com.bviit.analytics.common.exception.InvalidPeriodException;
import com.bviit.analytics.event.dto.EventNoteRequest;
import com.bviit.analytics.event.dto.EventNoteRow;
import com.bviit.analytics.event.entity.EventNote;
import com.bviit.analytics.event.repository.EventNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * 이벤트 노트 조회·등록·수정·삭제. 설계: docs/event-note/design.md
 *
 * 기간 조회는 event_date 기준(from ≤ event_date ≤ to). 삭제는 소프트 삭제이며,
 * 삭제된 행은 @SQLRestriction 때문에 조회·수정·삭제 모두에서 404 가 된다.
 */
@Service
@RequiredArgsConstructor
public class EventNoteService {

    /**
     * 차트용 전체 목록의 최대 구간(일). 페이징이 없어 상한을 둔다.
     * 3년 = 1,096일 — 주차 레포트가 3개 연도를 비교(years=2024,2025,2026)하고, 윤년이 낀 3년(2024~2026)이 1,096일이다.
     */
    static final long MAX_CHART_RANGE_DAYS = 1_096;

    /** 관리 화면 한 페이지 최대 행 수. */
    static final int MAX_PAGE_SIZE = 100;

    private final EventNoteRepository repository;

    /**
     * 관리 화면 페이징 목록. from/to 는 둘 다 주거나 둘 다 생략한다(생략 = 전체 기간, 페이징되므로 구간 상한 없음).
     * 정렬은 발생일 내림차순 고정.
     *
     * @param page 0부터 시작
     */
    @Transactional(readOnly = true)
    public PageResponse<EventNoteRow> findPage(LocalDate from, LocalDate to, int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("page 는 0 이상이어야 합니다.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("size 는 1~" + MAX_PAGE_SIZE + " 사이여야 합니다.");
        }
        PageRequest pageable = PageRequest.of(page, size);

        if (from == null && to == null) {
            return PageResponse.of(repository.findAllByOrderByEventDateDescIdDesc(pageable), EventNoteRow::from);
        }
        if (from == null || to == null) {
            throw new InvalidPeriodException("조회 시작일과 종료일은 함께 지정해야 합니다.");
        }
        validateOrder(from, to);
        Page<EventNote> result = repository.findByEventDateBetweenOrderByEventDateDescIdDesc(from, to, pageable);
        return PageResponse.of(result, EventNoteRow::from);
    }

    /** 차트 오버레이용 — 기간 안의 전체 목록(페이징 없음), 발생일 오름차순. */
    @Transactional(readOnly = true)
    public List<EventNoteRow> findAllForChart(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new InvalidPeriodException("조회 시작일과 종료일은 필수입니다.");
        }
        validateOrder(from, to);
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        if (days > MAX_CHART_RANGE_DAYS) {
            throw new InvalidPeriodException(
                    "조회 구간은 최대 " + MAX_CHART_RANGE_DAYS + "일까지입니다. (요청: " + days + "일)");
        }
        return repository.findByEventDateBetweenOrderByEventDateAscIdAsc(from, to).stream()
                .map(EventNoteRow::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventNoteRow get(Long id) {
        return EventNoteRow.from(findOrThrow(id));
    }

    @Transactional
    public EventNoteRow create(EventNoteRequest request) {
        // IDENTITY 라 save 시점에 INSERT 되고, Auditing 도 그때 created_*/updated_* 를 채운다.
        return EventNoteRow.from(repository.save(request.toEntity()));
    }

    @Transactional
    public EventNoteRow update(Long id, EventNoteRequest request) {
        EventNote note = findOrThrow(id);
        request.applyTo(note);
        // flush 해야 Auditing(@PreUpdate)이 updated_by/updated_at 을 갱신한 값으로 응답할 수 있다.
        return EventNoteRow.from(repository.saveAndFlush(note));
    }

    /** 소프트 삭제 — delete_flag 만 켠다. 이미 삭제된 행은 404. */
    @Transactional
    public void delete(Long id) {
        findOrThrow(id).delete();
    }

    private EventNote findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "이벤트 노트를 찾을 수 없습니다. id=" + id));
    }

    private static void validateOrder(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new InvalidPeriodException("조회 시작일이 종료일보다 늦을 수 없습니다.");
        }
    }
}
