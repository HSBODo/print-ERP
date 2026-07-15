package com.bviit.analytics.reservation.service;

import com.bviit.analytics.common.config.LegacyDataSourceConfig;
import com.bviit.analytics.reservation.dto.ReservationListHomepageResult;
import com.bviit.analytics.reservation.repository.ReservationListHomepageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;

/**
 * 예약자 리스트_홈페이지 — 레거시 홈페이지 온라인 예약 조회.
 *
 * <p>필터(구분·예약구분·검색)와 페이징은 화면에서 클라이언트 사이드로 처리한다. 여기서는
 * 등록일 구간만 잘라서 넘긴다 — 형제 리스트 API 와 동일한 분담이다.
 *
 * <p>{@code @Transactional} 을 붙이지 않는다. 트랜잭션 매니저는 primary DataSource 에만
 * 붙어 있어 legacy DataSource 조회에는 걸리지 않는다(붙여봐야 장식이다). 읽기 전용 단발
 * 조회라 트랜잭션이 필요 없다.
 */
@Service
@ConditionalOnExpression(LegacyDataSourceConfig.ENABLED_EXPRESSION)
@RequiredArgsConstructor
public class ReservationListHomepageService implements ReservationListHomepageReader {

    private final ReservationListHomepageRepository repository;

    @Override
    public ReservationListHomepageResult getReservationListHomepage(String from, String to) {
        return new ReservationListHomepageResult(
                repository.findList(from, to),
                repository.findLastRegDate(),
                repository.dialect().live()
        );
    }
}
