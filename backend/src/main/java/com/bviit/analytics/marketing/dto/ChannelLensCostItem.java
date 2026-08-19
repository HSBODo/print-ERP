package com.bviit.analytics.marketing.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * 채널별 렌즈 원가 한 행 — 실제 수술명을 <b>안(眼) 단위</b>로 펼쳐 단가표와 이은 결과.
 *
 * <p>렌즈는 눈 하나에 하나씩 들어가므로 사람이 아니라 안으로 센다.
 * 단가가 아직 입력되지 않은 안은 {@code lensEyesUnpriced} 로 따로 세어 화면이
 * "원가 미완성"을 표시할 수 있게 한다 — 0 을 원가로 쓰면 공헌이익이 부풀려진다.
 */
@Getter
@Builder
public class ChannelLensCostItem {

    private final String channel;

    /** 렌즈가 들어가는 수술의 총 안수 */
    private final int lensEyes;

    /** 그중 단가가 입력된 안수 */
    private final int lensEyesPriced;

    /** 그중 단가가 비어 있는 안수 — 0 보다 크면 원가·공헌이익은 미완성이다 */
    private final int lensEyesUnpriced;

    /** 입력된 단가만 합산한 렌즈 원가(만원) */
    private final long lensCostManwon;
}
