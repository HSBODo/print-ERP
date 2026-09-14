package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationListResult;

/**
 * 예약자 리스트 조회 계약.
 *
 * 구현체:
 *   - ReservationListService          : @Profile("postgres-mart") — 배치 소스·대사(reconcile) 전용
 *   - ReservationListMartQueryService : @Profile("postgres-mart") @Primary — Postgres 마트
 */
public interface ReservationListReader {
    ReservationListResult getReservationList(String from, String to);
}
