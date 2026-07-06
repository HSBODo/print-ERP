package com.bviit.analytics.auth.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String loginId;

    @Column(unique = true, nullable = false)
    private String email;

    @Setter(AccessLevel.NONE)
    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    // columnDefinition의 DEFAULT 'USER' — 기존 데이터가 있는 테이블에 NOT NULL 컬럼을
    // ALTER 로 추가할 때(Hibernate ddl-auto=update) 실패 방지. Postgres/H2(PostgreSQL 모드) 공통 문법.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "VARCHAR(20) NOT NULL DEFAULT 'USER'")
    @Builder.Default
    private Role role = Role.USER;
}
