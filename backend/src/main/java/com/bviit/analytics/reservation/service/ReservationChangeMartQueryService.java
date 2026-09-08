package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationChangeResult;
import com.bviit.analytics.reservation.repository.ReservationChangeMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 예약 변경이력 — Postgres 마트(list_reservation_change)에서 읽는다.
 * 등록일 범위로 조회하고, 기준일·구분·상태·변경횟수 필터는 프런트가 체인 문자열로 계산한다.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class ReservationChangeMartQueryService implements ReservationChangeReader {

    private final ReservationChangeMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public ReservationChangeResult getReservationChanges(String from, String to) {
        return new ReservationChangeResult(martRepository.findByRegisteredRange(from, to));
    }
}
