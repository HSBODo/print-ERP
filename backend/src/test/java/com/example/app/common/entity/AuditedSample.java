package com.example.app.common.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** BaseEntityAuditingTest 전용 — BaseEntity 를 상속한 최소 엔티티. */
@Entity
@Table(name = "audited_sample")
@Getter
@NoArgsConstructor
class AuditedSample extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    AuditedSample(String title) {
        this.title = title;
    }

    void rename(String newTitle) {
        this.title = newTitle;
    }
}
