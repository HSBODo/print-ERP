package com.example.app.common.dto;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * 서버 페이징 공용 응답 — {@code ApiResponse.ok(PageResponse.of(page, Row::from))} 로 감싸 내려준다.
 *
 * <pre>
 * { "content": [...], "page": 0, "size": 20, "totalElements": 57, "totalPages": 3 }
 * </pre>
 *
 * Spring {@link Page} 를 그대로 직렬화하지 않는 이유: Spring Data 3.3 부터 PageImpl 직렬화는
 * "JSON 구조가 바뀔 수 있다"는 경고를 내고, pageable·sort 등 화면에 필요 없는 필드도 딸려 나간다.
 * 프론트가 기대는 계약을 이 5개 필드로 고정한다.
 *
 * @param page 0부터 시작하는 페이지 번호 (Spring Data 와 같은 기준)
 */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {

    /** 엔티티 페이지를 DTO 로 바꿔 담는다. */
    public static <E, T> PageResponse<T> of(Page<E> page, Function<? super E, ? extends T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().<T>map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    /** 이미 DTO 로 된 페이지를 그대로 담는다. */
    public static <T> PageResponse<T> of(Page<T> page) {
        return of(page, Function.identity());
    }
}
