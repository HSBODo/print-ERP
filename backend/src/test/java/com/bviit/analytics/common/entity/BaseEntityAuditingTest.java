package com.bviit.analytics.common.entity;

import com.bviit.analytics.common.config.JpaAuditingConfig;
import com.bviit.analytics.event.entity.EventNote;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(JpaAuditingConfig.class)
class BaseEntityAuditingTest {

    @Autowired
    private TestEntityManager em;

    @AfterEach
    void clearLogin() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void 저장하면_로그인ID와_시각이_생성_수정_컬럼에_채워진다() {
        loginAs("admin");

        EventNote note = em.persistFlushFind(newNote());

        assertThat(note.getCreatedBy()).isEqualTo("admin");
        assertThat(note.getUpdatedBy()).isEqualTo("admin");
        assertThat(note.getCreatedAt()).isNotNull();
        assertThat(note.getUpdatedAt()).isEqualTo(note.getCreatedAt());
    }

    @Test
    void 수정하면_수정자만_바뀌고_생성자와_생성일시는_유지된다() {
        loginAs("admin");
        EventNote note = em.persistFlushFind(newNote());
        var createdAt = note.getCreatedAt();

        loginAs("manager01");
        note.update(LocalDate.of(2026, 9, 2), "수정된 요약", null, null, null);
        em.flush();
        em.clear();
        EventNote reloaded = em.find(EventNote.class, note.getId());

        assertThat(reloaded.getSummary()).isEqualTo("수정된 요약");
        assertThat(reloaded.getCreatedBy()).isEqualTo("admin");
        assertThat(reloaded.getCreatedAt()).isEqualTo(createdAt);
        assertThat(reloaded.getUpdatedBy()).isEqualTo("manager01");
        assertThat(reloaded.getUpdatedAt()).isAfterOrEqualTo(createdAt);
    }

    @Test
    void 로그인_컨텍스트가_없으면_system으로_기록된다() {
        EventNote note = em.persistFlushFind(newNote());

        assertThat(note.getCreatedBy()).isEqualTo(JpaAuditingConfig.SYSTEM_AUDITOR);
        assertThat(note.getUpdatedBy()).isEqualTo(JpaAuditingConfig.SYSTEM_AUDITOR);
    }

    @Test
    void 익명_사용자는_system으로_기록된다() {
        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken(
                "key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")));

        EventNote note = em.persistFlushFind(newNote());

        assertThat(note.getCreatedBy()).isEqualTo(JpaAuditingConfig.SYSTEM_AUDITOR);
    }

    @Test
    void 소프트_삭제한_행은_조회되지_않는다() {
        EventNote note = em.persistFlushFind(newNote());
        Long id = note.getId();

        note.delete();
        em.flush();
        em.clear();

        assertThat(em.find(EventNote.class, id)).isNull();
        assertThat(em.getEntityManager()
                .createQuery("select e from EventNote e where e.id = :id", EventNote.class)
                .setParameter("id", id)
                .getResultList()).isEmpty();
    }

    private static void loginAs(String loginId) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                loginId, null, AuthorityUtils.createAuthorityList("ROLE_ADMIN")));
    }

    private static EventNote newNote() {
        return EventNote.builder()
                .eventDate(LocalDate.of(2026, 9, 1))
                .summary("추석 프로모션 시작")
                .description("테스트 본문")
                .build();
    }
}
