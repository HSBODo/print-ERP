package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationChangeResult;

/**
 * 예약 변경이력 조회 계약. 화면은 마트만 읽는다 — MSSQL 직결 구현은 없다(배치가 적재).
 * 구현체: ReservationChangeMartQueryService (@Profile("postgres-mart") @Primary)
 */
public interface ReservationChangeReader {
    ReservationChangeResult getReservationChanges(String from, String to);
}
