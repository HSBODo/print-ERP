package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationListHomepageResult;
import com.bviit.analytics.reservation.repository.ReservationListHomepageMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 예약자 리스트_홈페이지 — Postgres 마트에서 직접 읽는다.
 *
 * <p>postgres-mart 프로파일에서 {@code @Primary}. 컨트롤러가 {@link ReservationListHomepageReader}
 * 를 주입받으면 소스판({@link ReservationListHomepageService}) 보다 이 구현체가 우선 선택된다
 * ({@code ReservationListMartQueryService} 와 동일한 배치).
 *
 * <p><b>live=false 고정</b> — 마트는 배치 이후 시점까지만 담고 있어 소스 실시간이 아니다.
 * 스냅샷과 같은 '천장' 의미이므로 화면이 조회 종료일 > lastRegDate 이면 경고 배너를 띄운다.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class ReservationListHomepageMartQueryService implements ReservationListHomepageReader {

    private final ReservationListHomepageMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public ReservationListHomepageResult getReservationListHomepage(String from, String to) {
        return new ReservationListHomepageResult(
                martRepository.findList(from, to),
                martRepository.findLastRegDate(),
                false
        );
    }
}
