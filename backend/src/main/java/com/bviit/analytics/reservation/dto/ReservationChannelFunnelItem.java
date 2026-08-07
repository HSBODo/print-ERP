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
    /** 그중 검사중단(exam_stop='Y')이 아닌 건 — 중단하면 수술로 가지 않는다(2026-07 중단 40건 전부 수술 0) */
    private final int notStop;
    /** 그중 수술등록일이 있는 건 */
    private final int surgery;
    /** 그 수술들의 수납액 합(원). 아직 수술 전이면 0 이라 인원보다 늦게 찬다. */
    private final long surgeryAmount;

    /* ── 사람 수 ──
     * 같은 사람이 그 달에 두 번 예약하면 건수는 2, 사람수는 1 이다.
     * 식별은 휴대폰 > 이메일 > 차트번호 > 이름 순(v_reservation_channel.person).
     *
     * ⚠️ 채널별 DISTINCT 라 **채널 합계 ≠ 전체 사람수** 다. 한 사람이 두 채널로 예약하면
     *    채널마다 1 명씩 세어진다. 합계는 아래 total* 을 쓸 것(모든 행에 같은 값이 실려 온다).
     */
    private final int reservedPersons;
    private final int notCancelPersons;
    private final int visitedPersons;
    private final int examinedPersons;
    private final int notStopPersons;
    private final int surgeryPersons;

    /* ── 전체(채널 무관) 사람 수 — 합계행 전용. 모든 행에 같은 값. ── */
    private final int totalReservedPersons;
    private final int totalNotCancelPersons;
    private final int totalVisitedPersons;
    private final int totalExaminedPersons;
    private final int totalNotStopPersons;
    private final int totalSurgeryPersons;
    /** 전체 기준 수술 수납액 합(원) — 합계행 전용. */
    private final long totalSurgeryAmount;
}
