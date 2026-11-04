package com.example.app.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 생성자·생성일시·수정자·수정일시 공용 컬럼 — JPA Auditing 이 저장 시점에 자동으로 채운다.
 *
 * 작성자는 로그인 ID({@code authentication.getName()}), 로그인 컨텍스트가 없으면 "system"
 * ({@link com.example.app.common.config.JpaAuditingConfig}).
 * 시각은 JVM 시계(Asia/Seoul 고정) 기준이며 DB 의 now() 는 쓰지 않는다.
 *
 * 값을 바꾸는 메서드는 두지 않는다. 호출측이 audit 값을 직접 넣는 경로를 막기 위함이다.
 */
@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @CreatedBy
    @Column(name = "created_by", length = 50, nullable = false, updatable = false)
    private String createdBy;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedBy
    @Column(name = "updated_by", length = 50, nullable = false)
    private String updatedBy;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
