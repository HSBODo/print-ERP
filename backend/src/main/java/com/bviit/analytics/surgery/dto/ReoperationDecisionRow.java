package com.bviit.analytics.surgery.dto;

import com.bviit.analytics.surgery.entity.ReoperationDecision;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 재수술 판정 응답 행.
 *
 * ⚠️ boolean isReoperation 필드는 Lombok @Getter 가 만드는 isReoperation() 가
 * Jackson 의 boolean is-getter 규칙에 걸려 JSON 키가 "reoperation" 으로 잘리는 이슈가 있다.
 * 필드 기준 직렬화로 강제해서 프론트 스키마(isReoperation) 와 계약을 맞춘다.
 */
@Getter
@Builder
@JsonAutoDetect(
        fieldVisibility = JsonAutoDetect.Visibility.ANY,
        getterVisibility = JsonAutoDetect.Visibility.NONE,
        isGetterVisibility = JsonAutoDetect.Visibility.NONE
)
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
