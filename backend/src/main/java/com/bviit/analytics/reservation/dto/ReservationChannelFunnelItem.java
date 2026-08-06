package com.bviit.analytics.reservation.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * 예약 채널별 퍼널 한 행.
 *
 * 단계는 예약자 리스트에서 차례로 걸러낸 것이며 뒤로 갈수록 앞 단계의 부분집합이다.
 * 사람이 아니라 <b>예약 건</b> 단위 — 같은 사람이 취소하고 다시 잡으면 2건이 맞다.
 */
@Getter
@Builder
public class ReservationChannelFunnelItem {

    /** 채널명 — 내원동기(중) 매체명 > 직원 설정표 > 예약경로 순으로 판정 (v_reservation_channel) */
    private final String channel;

    /** 전체 예약 (등록일 기준) */
    private final int reserved;
    /** 취소(C) 제외 */
    private final int notCancel;
    /** 미내원(Y)까지 제외 → 실제 내원한 건 */
    private final int visited;
    /** 그중 검사등록일이 있는 건 */
    private final int examined;
    /** 그중 수술등록일이 있는 건 */
    private final int surgery;
}
