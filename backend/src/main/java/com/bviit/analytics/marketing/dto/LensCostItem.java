package com.bviit.analytics.marketing.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 시술유형별 렌즈 매입 단가 — <b>안(眼) 1개당 만원</b>.
 *
 * <p>opType 은 surgery_op_type() 이 내는 코드와 같아야 한다(icl·tIcl·kpl·tKpl·viva).
 * 난시교정(T-) 은 단가가 달라 별도 행이다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LensCostItem {

    @NotBlank
    private String opType;

    @Min(value = 0, message = "단가는 0 이상이어야 합니다.")
    private int unitCostManwon;
}
