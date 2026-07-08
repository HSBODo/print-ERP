package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationListResult;
import com.bviit.analytics.reservation.repository.ReservationStatsMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 예약자 리스트 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. 컨트롤러가 ReservationListReader를 주입하면
 * MSSQL 버전(ReservationListService)보다 이 구현체가 우선 선택된다.
 *
 * kakaoCount는 마트의 mart_reservation_kakao_daily 일별 건수 SUM.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class ReservationListMartQueryService implements ReservationListReader {

    private final ReservationStatsMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public ReservationListResult getReservationList(String from, String to) {
        return new ReservationListResult(
                martRepository.findList(from, to),
                martRepository.findKakaoCount(from, to)
        );
    }
}
