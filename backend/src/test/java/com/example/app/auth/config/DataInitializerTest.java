package com.example.app.auth.config;

import com.example.app.auth.entity.Department;
import com.example.app.auth.entity.Role;
import com.example.app.auth.entity.User;
import com.example.app.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DataInitializerTest {

    private UserRepository userRepository;
    private DataInitializer initializer;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        initializer = new DataInitializer(userRepository, new BCryptPasswordEncoder());
        ReflectionTestUtils.setField(initializer, "seedEnabled", true);
        ReflectionTestUtils.setField(initializer, "adminLoginId", " Admin ");
        ReflectionTestUtils.setField(initializer, "adminEmail", "Admin@Example.com");
        ReflectionTestUtils.setField(initializer, "adminName", "관리자");
    }

    @Test
    void 사용자가_없으면_ADMIN_ALL_계정을_만든다() {
        ReflectionTestUtils.setField(initializer, "adminPassword", "StrongPass123");
        when(userRepository.count()).thenReturn(0L);

        initializer.run();

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getLoginId()).isEqualTo("admin");
        assertThat(saved.getValue().getEmail()).isEqualTo("admin@example.com");
        assertThat(saved.getValue().getRole()).isEqualTo(Role.ADMIN);
        assertThat(saved.getValue().getDepartment()).isEqualTo(Department.ALL);
        assertThat(saved.getValue().getPassword()).isNotEqualTo("StrongPass123");
    }

    @Test
    void 이미_사용자가_있으면_아무것도_하지_않는다() {
        ReflectionTestUtils.setField(initializer, "adminPassword", "StrongPass123");
        when(userRepository.count()).thenReturn(1L);

        initializer.run();

        verify(userRepository, never()).save(any());
    }

    @Test
    void 비밀번호가_8자_미만이면_기동을_거부한다() {
        ReflectionTestUtils.setField(initializer, "adminPassword", "short");
        when(userRepository.count()).thenReturn(0L);

        assertThatThrownBy(() -> initializer.run())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 8");
        verify(userRepository, never()).save(any());
    }

    @Test
    void 비밀번호가_비어_있으면_기동을_거부한다() {
        ReflectionTestUtils.setField(initializer, "adminPassword", "  ");
        when(userRepository.count()).thenReturn(0L);

        assertThatThrownBy(() -> initializer.run())
                .isInstanceOf(IllegalStateException.class);
    }
}
