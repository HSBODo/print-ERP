package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationListResult;

/**
 * 예약자 리스트 조회 계약.
 *
 * 구현체:
 *   - ReservationListService          : @Profile({"mssql","postgres-mart"}) — MSSQL 직결 (레거시)
 *   - ReservationListMartQueryService : @Profile("postgres-mart") @Primary — Postgres 마트
 */
public interface ReservationListReader {
    ReservationListResult getReservationList(String from, String to);
}
