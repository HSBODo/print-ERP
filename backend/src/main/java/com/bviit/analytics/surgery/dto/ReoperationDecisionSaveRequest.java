package com.bviit.analytics.surgery.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/**
 * 재수술 판정 배치 저장 요청.
 *
 * 재수술 검토 모달의 화면 상태 전체를 한 번에 upsert 한다.
 * (chartNo, opDate) 유니크 기준으로 있으면 갱신, 없으면 신규 저장.
 */
@Getter
@Setter
@NoArgsConstructor
public class ReoperationDecisionSaveRequest {

    @NotEmpty(message = "저장할 판정이 없습니다.")
    @Valid
    private List<Item> decisions;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Item {
        @NotNull(message = "차트번호는 필수입니다.")
        @Size(max = 50, message = "차트번호는 50자를 넘을 수 없습니다.")
        private String chartNo;

        @NotNull(message = "수술일은 필수입니다.")
        private LocalDate opDate;

        @NotNull(message = "재수술 여부는 필수입니다.")
        private Boolean isReoperation;

        @Size(max = 500, message = "메모는 500자를 넘을 수 없습니다.")
        private String memo;
    }
}
