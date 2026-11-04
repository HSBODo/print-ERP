package com.example.app.common.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PageResponseTest {

    @Test
    void 페이지_메타와_변환된_내용을_담는다() {
        Page<Integer> page = new PageImpl<>(List.of(21, 22, 23), PageRequest.of(2, 10), 23);

        PageResponse<String> response = PageResponse.of(page, n -> "row-" + n);

        assertThat(response.content()).containsExactly("row-21", "row-22", "row-23");
        assertThat(response.page()).isEqualTo(2);
        assertThat(response.size()).isEqualTo(10);
        assertThat(response.totalElements()).isEqualTo(23);
        assertThat(response.totalPages()).isEqualTo(3);
    }

    @Test
    void 변환_없이_그대로_담을_수_있다() {
        Page<String> page = new PageImpl<>(List.of("a", "b"), PageRequest.of(0, 20), 2);

        PageResponse<String> response = PageResponse.of(page);

        assertThat(response.content()).containsExactly("a", "b");
        assertThat(response.totalPages()).isEqualTo(1);
    }

    @Test
    void 결과가_없으면_빈_목록과_0건_0페이지다() {
        Page<String> page = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);

        PageResponse<String> response = PageResponse.of(page);

        assertThat(response.content()).isEmpty();
        assertThat(response.totalElements()).isZero();
        assertThat(response.totalPages()).isZero();
    }

    @Test
    void JSON은_5개_필드만_내려간다() throws Exception {
        Page<String> page = new PageImpl<>(List.of("a"), PageRequest.of(0, 20), 1);

        JsonNode json = new ObjectMapper().valueToTree(PageResponse.of(page));

        assertThat(json.properties()).extracting(e -> e.getKey())
                .containsExactly("content", "page", "size", "totalElements", "totalPages");
        assertThat(json.get("content").get(0).asText()).isEqualTo("a");
    }
}
