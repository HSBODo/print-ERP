package com.example.app.common.entity;

import com.example.app.common.config.JpaAuditingConfig;
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

        AuditedSample sample = em.persistFlushFind(new AuditedSample("첫 제목"));

        assertThat(sample.getCreatedBy()).isEqualTo("admin");
        assertThat(sample.getUpdatedBy()).isEqualTo("admin");
        assertThat(sample.getCreatedAt()).isNotNull();
        assertThat(sample.getUpdatedAt()).isEqualTo(sample.getCreatedAt());
    }

    @Test
    void 수정하면_수정자만_바뀌고_생성자와_생성일시는_유지된다() {
        loginAs("admin");
        AuditedSample sample = em.persistFlushFind(new AuditedSample("첫 제목"));
        var createdAt = sample.getCreatedAt();

        loginAs("manager01");
        sample.rename("수정된 제목");
        em.flush();
        em.clear();
        AuditedSample reloaded = em.find(AuditedSample.class, sample.getId());

        assertThat(reloaded.getTitle()).isEqualTo("수정된 제목");
        assertThat(reloaded.getCreatedBy()).isEqualTo("admin");
        assertThat(reloaded.getCreatedAt()).isEqualTo(createdAt);
        assertThat(reloaded.getUpdatedBy()).isEqualTo("manager01");
        assertThat(reloaded.getUpdatedAt()).isAfterOrEqualTo(createdAt);
    }

    @Test
    void 로그인_컨텍스트가_없으면_system으로_기록된다() {
        AuditedSample sample = em.persistFlushFind(new AuditedSample("제목"));

        assertThat(sample.getCreatedBy()).isEqualTo(JpaAuditingConfig.SYSTEM_AUDITOR);
        assertThat(sample.getUpdatedBy()).isEqualTo(JpaAuditingConfig.SYSTEM_AUDITOR);
    }

    @Test
    void 익명_사용자는_system으로_기록된다() {
        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken(
                "key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")));

        AuditedSample sample = em.persistFlushFind(new AuditedSample("제목"));

        assertThat(sample.getCreatedBy()).isEqualTo(JpaAuditingConfig.SYSTEM_AUDITOR);
    }

    private static void loginAs(String loginId) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                loginId, null, AuthorityUtils.createAuthorityList("ROLE_ADMIN")));
    }
}
