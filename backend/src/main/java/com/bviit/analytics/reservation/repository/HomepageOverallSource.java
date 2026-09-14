package com.bviit.analytics.reservation.repository;

import java.util.List;
import java.util.Map;

/**
 * 예약 종합 계산에서 사용하는 홈페이지 데이터 소스.
 *
 * <p>온라인 예약 공식 = 네이버 + 카카오톡 + <b>홈페이지(리스트 화면 raw 건수)</b>. 이 인터페이스가
 * '홈페이지' 몫을 제공한다({@link com.bviit.analytics.reservation.service.ReservationOverallStatsService}).
 *
 * <p>두 구현이 있다:
 * <ul>
 *   <li>{@link ReservationListHomepageRepository} — 레거시 소스(SQLite/MariaDB) 직결.
 *       {@code homepage.datasource.url} 이 설정된 경우에만 빈으로 등록된다.
 *   <li>{@link ReservationListHomepageMartRepository} — {@code mart_list_reservation_homepage} 마트 조회.
 *       {@code postgres-mart} 프로파일에서 {@code @Primary} — Optional 이 마트 쪽으로 해결된다.
 * </ul>
 *
 * <p><b>배치 순서 결합</b> — postgres-mart 에서 마트를 읽으므로, 이 인터페이스 사용 잡보다
 * {@code ReservationListHomepageMartJob} 이 먼저 실행돼야 한다({@code BatchOrchestrator.runDomains}
 * 의 RESERVATION 블록에서 순서 강제).
 */
public interface HomepageOverallSource {

    /**
     * 월별 홈페이지 예약 건수 — 예약자 리스트_홈페이지 화면과 동일한 raw 건수 (yr / mo / cnt).
     * 조건: 전 진료(백내장·노안·렌즈삽입 등 포함) · COUNT(*) · 반개구간.
     * ⚠️ 네이버·카카오는 시력교정만 집계 — 이 홈페이지 판만 전 진료 포함이라 진료 범위 비대칭(의도적).
     */
    List<Map<String, Object>> findMonthlyListRawCounts(String from, String to);

    /**
     * 일별 홈페이지 예약 건수 (d / cnt) — 주차 레포트가 주(월~일)로 다시 묶어 쓴다.
     * 필터·계산은 {@link #findMonthlyListRawCounts} 와 동일하고 버킷만 월→일이다.
     */
    List<Map<String, Object>> findDailyListRawCounts(String from, String to);

    /**
     * 소스가 담고 있는 마지막 등록일시. 값이 없으면 빈 문자열.
     * 마트 구현에서는 배치 이후로의 '천장' 의미 — 화면·계산이 부분 월을 null 로 끊는 데 쓴다.
     */
    String findLastRegDate();
}
