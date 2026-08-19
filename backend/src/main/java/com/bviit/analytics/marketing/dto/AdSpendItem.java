package com.bviit.analytics.marketing.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 월 × 매체 광고비(만원). CRM 에 광고비 데이터가 없어 화면에서 직접 입력받는다.
 *
 * <p>media 는 유입채널이 아니라 <b>광고 상품</b> 코드다
 * (naver_reserve · naver_search · modoodoc). 검색광고처럼 매출 귀속이 안 되는
 * 상품도 비용은 기록해 둬야 전체 광고비를 알 수 있다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdSpendItem {

    @NotBlank
    @Pattern(regexp = "[0-9]{4}-[0-9]{2}", message = "ym 은 YYYY-MM 형식이어야 합니다.")
    private String ym;

    @NotBlank
    private String media;

    @Min(value = 0, message = "광고비는 0 이상이어야 합니다.")
    private int amountManwon;
}
