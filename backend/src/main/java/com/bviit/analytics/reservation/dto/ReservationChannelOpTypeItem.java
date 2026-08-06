package com.bviit.analytics.reservation.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * 예약 채널 × 실제 수술 유형 한 행.
 *
 * 수술명(OPERATIONDATA·Cataract_Operationdata)에서 분류한 값이라 추정이 아니다.
 * 눈별로 펼쳐 세므로 좌우에 다른 시술을 받으면 두 유형 모두에 잡힌다(같은 유형 양안은 1명).
 */
@Getter
@Builder
public class ReservationChannelOpTypeItem {

    /** 채널명. null 이면 <b>전체 기준</b> 행이다 — 채널별 사람수를 더하면 중복되므로 따로 낸다. */
    private final String channel;

    /** surgery_op_type() 결과 — smilePro·smile·lasek·tIcl·icl·lasik·tKpl·kpl·presbyond·viva·cat*·other */
    private final String opType;

    /** 그 유형을 받은 사람 수 */
    private final int persons;
}
