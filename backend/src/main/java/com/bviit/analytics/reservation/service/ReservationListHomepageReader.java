package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationListHomepageResult;

/**
 * 예약자 리스트_홈페이지 조회 계약.
 *
 * <p>구현체는 소스가 설정된 경우에만 빈으로 존재한다. 컨트롤러는 {@code Optional} 로 받아
 * 부재 시 503 을 준다(형제 리스트 API 의 Reader 패턴과 동일).
 */
public interface ReservationListHomepageReader {

    /**
     * @param from 등록일 시작(YYYY-MM-DD, 포함)
     * @param to   등록일 종료(YYYY-MM-DD, 포함 — 그날 23시대 등록분까지 포함한다)
     */
    ReservationListHomepageResult getReservationListHomepage(String from, String to);
}
