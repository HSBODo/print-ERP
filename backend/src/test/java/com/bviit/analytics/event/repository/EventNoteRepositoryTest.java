package com.bviit.analytics.event.repository;

import com.bviit.analytics.common.config.JpaAuditingConfig;
import com.bviit.analytics.event.entity.EventNote;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(JpaAuditingConfig.class)
class EventNoteRepositoryTest {

    private static final LocalDate FROM = LocalDate.of(2026, 9, 1);
    private static final LocalDate TO = LocalDate.of(2026, 9, 30);

    @Autowired
    private EventNoteRepository repository;

    @Autowired
    private TestEntityManager em;

    @Test
    void 발생일이_구간_안이면_포함되고_경계일도_포함한다() {
        save("시작일 당일", LocalDate.of(2026, 9, 1));
        save("종료일 당일", LocalDate.of(2026, 9, 30));
        save("구간 전날", LocalDate.of(2026, 8, 31));
        save("구간 다음날", LocalDate.of(2026, 10, 1));

        assertThat(summaries(repository.findByEventDateBetweenOrderByEventDateAscIdAsc(FROM, TO)))
                .containsExactly("시작일 당일", "종료일 당일");
    }

    @Test
    void 시작일_종료일은_조회_조건에_쓰지_않고_발생일만_본다() {
        // 기간은 9월에 걸치지만 발생일이 8월 — 제외
        saveRange("발생일 8월", LocalDate.of(2026, 8, 25), LocalDate.of(2026, 8, 25), LocalDate.of(2026, 9, 5));
        // 기간은 10월까지 이어지지만 발생일이 9월 — 포함
        saveRange("발생일 9월", LocalDate.of(2026, 9, 28), LocalDate.of(2026, 9, 28), LocalDate.of(2026, 10, 10));

        assertThat(summaries(repository.findByEventDateBetweenOrderByEventDateAscIdAsc(FROM, TO)))
                .containsExactly("발생일 9월");
    }

    @Test
    void 소프트_삭제한_이벤트는_조회에서_빠진다() {
        save("살아있음", LocalDate.of(2026, 9, 10));
        EventNote deleted = save("삭제됨", LocalDate.of(2026, 9, 11));
        deleted.delete();
        repository.saveAndFlush(deleted);
        em.clear(); // 1차 캐시에 남은 엔티티가 아니라 DB 에서 다시 읽는다 (실제 요청은 별도 트랜잭션)

        assertThat(summaries(repository.findByEventDateBetweenOrderByEventDateAscIdAsc(FROM, TO))).containsExactly("살아있음");
        assertThat(repository.findById(deleted.getId())).isEmpty();
        assertThat(repository.findAllByOrderByEventDateDescIdDesc(PageRequest.of(0, 10)).getTotalElements()).isEqualTo(1);
    }

    @Test
    void 차트용_목록은_발생일_오름차순_같은날은_id_오름차순이다() {
        save("9/20", LocalDate.of(2026, 9, 20));
        save("9/5-a", LocalDate.of(2026, 9, 5));
        save("9/5-b", LocalDate.of(2026, 9, 5));

        assertThat(summaries(repository.findByEventDateBetweenOrderByEventDateAscIdAsc(FROM, TO)))
                .containsExactly("9/5-a", "9/5-b", "9/20");
    }

    @Test
    void 관리_화면_페이징은_발생일_내림차순이고_전체건수를_센다() {
        for (int day = 1; day <= 25; day++) {
            save("9/" + day, LocalDate.of(2026, 9, day));
        }
        save("범위 밖", LocalDate.of(2026, 10, 15));

        Page<EventNote> first = repository.findByEventDateBetweenOrderByEventDateDescIdDesc(FROM, TO, PageRequest.of(0, 10));
        Page<EventNote> last = repository.findByEventDateBetweenOrderByEventDateDescIdDesc(FROM, TO, PageRequest.of(2, 10));

        assertThat(first.getTotalElements()).isEqualTo(25);
        assertThat(first.getTotalPages()).isEqualTo(3);
        assertThat(first.getContent()).first().extracting(EventNote::getSummary).isEqualTo("9/25");
        assertThat(summaries(last.getContent())).containsExactly("9/5", "9/4", "9/3", "9/2", "9/1");
    }

    @Test
    void 기간_필터_없는_페이징은_전체를_발생일_내림차순으로_준다() {
        save("과거", LocalDate.of(2025, 1, 1));
        save("최근", LocalDate.of(2026, 9, 1));

        Page<EventNote> page = repository.findAllByOrderByEventDateDescIdDesc(PageRequest.of(0, 10));

        assertThat(summaries(page.getContent())).containsExactly("최근", "과거");
    }

    private EventNote save(String summary, LocalDate eventDate) {
        return saveRange(summary, eventDate, null, null);
    }

    private EventNote saveRange(String summary, LocalDate eventDate, LocalDate startDate, LocalDate endDate) {
        return repository.saveAndFlush(EventNote.builder()
                .eventDate(eventDate)
                .summary(summary)
                .startDate(startDate)
                .endDate(endDate)
                .build());
    }

    private static List<String> summaries(List<EventNote> notes) {
        return notes.stream().map(EventNote::getSummary).toList();
    }
}
