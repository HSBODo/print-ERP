package com.example.app.auth.repository;

import com.example.app.auth.entity.Role;
import com.example.app.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByLoginIdIgnoreCase(String loginId);

    boolean existsByLoginIdIgnoreCase(String loginId);

    boolean existsByEmailIgnoreCase(String email);

    /** 계정 관리 목록 정렬 — loginId 오름차순. */
    List<User> findAllByOrderByLoginIdAsc();

    long countByRole(Role role);
}
