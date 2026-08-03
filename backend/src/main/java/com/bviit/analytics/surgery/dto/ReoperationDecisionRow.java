package com.bviit.analytics.surgery.dto;

import com.bviit.analytics.surgery.entity.ReoperationDecision;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 재수술 판정 응답 행. */
@Getter
@Builder
public class ReoperationDecisionRow {

    private final Long id;
    private final String chartNo;
    private final LocalDate opDate;
    private final boolean isReoperation;
    private final String memo;
    private final LocalDateTime updatedAt;
    private final String updatedBy;

    public static ReoperationDecisionRow from(ReoperationDecision e) {
        return ReoperationDecisionRow.builder()
                .id(e.getId())
                .chartNo(e.getChartNo())
                .opDate(e.getOpDate())
                .isReoperation(e.isReoperation())
                .memo(e.getMemo())
                .updatedAt(e.getUpdatedAt())
                .updatedBy(e.getUpdatedBy())
                .build();
    }
}
