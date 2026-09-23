package com.bviit.analytics.event.service;

import com.bviit.analytics.common.config.JpaAuditingConfig;
import com.bviit.analytics.common.dto.PageResponse;
import com.bviit.analytics.common.exception.InvalidPeriodException;
import com.bviit.analytics.event.dto.EventNoteRequest;
import com.bviit.analytics.event.dto.EventNoteRow;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Import({EventNoteService.class, JpaAuditingConfig.class})
class EventNoteServiceTest {

    private static final LocalDate SEP_1 = LocalDate.of(2026, 9, 1);
    private static final LocalDate SEP_30 = LocalDate.of(2026, 9, 30);

    @Autowired
    private EventNoteService service;

    @Autowired
    private TestEntityManager em;

    @AfterEach
    void clearLogin() {
        SecurityContextHolder.clearContext();
    }

    /* ── 등록·수정·삭제 ── */

    @Test
    void 등록하면_id와_작성자가_채워진_행을_돌려준다() {
        loginAs("admin");

        EventNoteRow row = service.create(request(SEP_1, "추석 프로모션"));

        assertThat(row.id()).isNotNull();
        assertThat(row.summary()).isEqualTo("추석 프로모션");
        assertThat(row.createdBy()).isEqualTo("admin");
        assertThat(row.createdAt()).isNotNull();
    }

    @Test
    void 수정하면_값이_교체되고_응답에_수정자가_반영된다() {
        loginAs("admin");
        Long id = service.create(request(SEP_1, "처음")).id();

        loginAs("manager01");
        EventNoteRow updated = service.update(id, new EventNoteRequest(SEP_1.plusDays(1), "바뀜", "본문", null, null));

        assertThat(updated.eventDate()).isEqualTo(SEP_1.plusDays(1));
        assertThat(updated.summary()).isEqualTo("바뀜");
        assertThat(updated.createdBy()).isEqualTo("admin");
        assertThat(updated.updatedBy()).isEqualTo("manager01");
    }

    @Test
    void 삭제한_행은_조회_수정_재삭제_모두_404다() {
        Long id = service.create(request(SEP_1, "삭제 대상")).id();

        service.delete(id);
        em.flush();
        em.clear(); // 실제 요청처럼 다음 호출은 DB 에서 다시 읽는다

        assertNotFound(() -> service.get(id));
        assertNotFound(() -> service.update(id, request(SEP_1, "x")));
        assertNotFound(() -> service.delete(id));
        assertThat(service.findAllForChart(SEP_1, SEP_30)).isEmpty();
    }

    @Test
    void 없는_id는_404다() {
        assertNotFound(() -> service.get(999_999L));
    }

    /* ── 관리 화면 페이징 ── */

    @Test
    void 기간_없이_조회하면_전체를_페이징한다() {
        service.create(request(LocalDate.of(2025, 1, 1), "과거"));
        service.create(request(SEP_1, "최근"));

        PageResponse<EventNoteRow> page = service.findPage(null, null, 0, 20);

        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.content()).extracting(EventNoteRow::summary).containsExactly("최근", "과거");
    }

    @Test
    void 기간을_주면_발생일_기준으로_거른다() {
        service.create(request(LocalDate.of(2026, 8, 31), "8월"));
        service.create(request(SEP_1, "9월"));

        PageResponse<EventNoteRow> page = service.findPage(SEP_1, SEP_30, 0, 20);

        assertThat(page.content()).extracting(EventNoteRow::summary).containsExactly("9월");
    }

    @Test
    void 시작일_종료일_중_하나만_주면_400이다() {
        assertThatThrownBy(() -> service.findPage(SEP_1, null, 0, 20)).isInstanceOf(InvalidPeriodException.class);
        assertThatThrownBy(() -> service.findPage(null, SEP_30, 0, 20)).isInstanceOf(InvalidPeriodException.class);
    }

    @Test
    void 페이지_번호와_크기가_범위를_벗어나면_400이다() {
        assertThatThrownBy(() -> service.findPage(null, null, -1, 20)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.findPage(null, null, 0, 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.findPage(null, null, 0, EventNoteService.MAX_PAGE_SIZE + 1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(service.findPage(null, null, 0, EventNoteService.MAX_PAGE_SIZE).size())
                .isEqualTo(EventNoteService.MAX_PAGE_SIZE);
    }

    /* ── 차트 전체 목록 ── */

    @Test
    void 차트용은_기간_안_전체를_발생일_오름차순으로_준다() {
        service.create(request(SEP_30, "말일"));
        service.create(request(SEP_1, "1일"));
        service.create(request(LocalDate.of(2026, 10, 1), "범위 밖"));

        List<EventNoteRow> rows = service.findAllForChart(SEP_1, SEP_30);

        assertThat(rows).extracting(EventNoteRow::summary).containsExactly("1일", "말일");
    }

    @Test
    void 차트용은_기간이_필수이고_3년_1096일까지만_허용한다() {
        LocalDate from = LocalDate.of(2024, 1, 1);

        assertThat(service.findAllForChart(from, LocalDate.of(2026, 12, 31))).isEmpty(); // 1,096일
        assertThatThrownBy(() -> service.findAllForChart(from, LocalDate.of(2027, 1, 1)))
                .isInstanceOf(InvalidPeriodException.class)
                .hasMessageContaining("1097");
        assertThatThrownBy(() -> service.findAllForChart(null, SEP_30)).isInstanceOf(InvalidPeriodException.class);
    }

    @Test
    void 시작일이_종료일보다_늦으면_400이다() {
        assertThatThrownBy(() -> service.findAllForChart(SEP_30, SEP_1)).isInstanceOf(InvalidPeriodException.class);
        assertThatThrownBy(() -> service.findPage(SEP_30, SEP_1, 0, 20)).isInstanceOf(InvalidPeriodException.class);
    }

    private static EventNoteRequest request(LocalDate eventDate, String summary) {
        return new EventNoteRequest(eventDate, summary, null, null, null);
    }

    private static void loginAs(String loginId) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                loginId, null, AuthorityUtils.createAuthorityList("ROLE_ADMIN")));
    }

    private static void assertNotFound(Runnable call) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
