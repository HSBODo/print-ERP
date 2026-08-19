package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationListResult;
import com.bviit.analytics.reservation.repository.ReservationListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 예약자 리스트 조회 서비스. 등록일 범위 기준 명단 행을 반환한다.
 * 주차 그룹·승인/체크 등 워크플로우는 프론트에서 클라이언트 사이드로 처리한다.
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class ReservationListService implements ReservationListReader {

    private final ReservationListRepository repository;

    @Override
    @Transactional(readOnly = true)
    public ReservationListResult getReservationList(String from, String to) {
        return new ReservationListResult(repository.findReservationList(from, to));
    }
}
