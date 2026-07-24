package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import com.bviit.analytics.reservation.repository.HomepageOverallSource;
import com.bviit.analytics.reservation.repository.ReservationOverallMartRepository;
import com.bviit.analytics.reservation.repository.ReservationStatsSystemMartRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 예약 종합 마트 조회 서비스 — 컷오버(2026-01) 이후 온라인·콜 모두 요청 시점에 시력교정 마트 SUM 으로 대체.
 *
 * <pre>
 *   2024·2025 : mart_reservation_overall_monthly 그대로 (V12 시드 확정값)
 *   2026-01 ~ : online = 네이버 + 카카오(시스템 마트) + 홈페이지(홈페이지 마트)
 *               call   = call_reservation + tm_reservation + tm_recounsel_reservation (시스템 마트)
 *               reservations = call + online
 * </pre>
 */
class ReservationOverallMartQueryServiceTest {

    private ReservationOverallMartRepository martRepository;
    private ReservationStatsSystemMartRepository systemMartRepository;
    private HomepageOverallSource homepageRepository;

    /** 마트: 2025-12 → online 200/call 100/total 300 (컷오버 이전, 그대로), 2026-06 → 컷오버 이후 라이브로 덮여야 함 */
    private static List<ReservationOverallMonthlyItem> martMonthly() {
        return List.of(
                ReservationOverallMonthlyItem.builder()
                        .year(2025).month(12).reservations(300).online(200).call(100).total(300).build(),
                ReservationOverallMonthlyItem.builder()
                        .year(2026).month(6).reservations(333).online(222).call(111).total(333).build()
        );
    }

    private static ReservationOverallMonthlyItem monthOf(List<ReservationOverallMonthlyItem> items, int year, int month) {
        return items.stream().filter(i -> i.getYear() == year && i.getMonth() == month).findFirst().orElseThrow();
    }

    @BeforeEach
    void setUp() {
        martRepository = mock(ReservationOverallMartRepository.class);
        systemMartRepository = mock(ReservationStatsSystemMartRepository.class);
        homepageRepository = mock(HomepageOverallSource.class);

        when(martRepository.findMonthly(anyList())).thenReturn(martMonthly());
        when(systemMartRepository.findMonthlyChannelReservationSums(anyString(), anyString())).thenReturn(List.of(
                Map.of("yr", 2026, "mo", 6,
                        "naver_cnt", 50, "kakao_cnt", 12,
                        "call_reservation_cnt", 40,
                        "tm_reservation_cnt", 25,
                        "tm_recounsel_reservation_cnt", 8)
        ));
        when(homepageRepository.findMonthlyListRawCounts(anyString(), anyString()))
                .thenReturn(List.of(Map.of("yr", 2026, "mo", 6, "cnt", 202)));
        when(homepageRepository.findLastRegDate()).thenReturn("2026-07-10 16:15:55");
    }

    private ReservationOverallMartQueryService service() {
        return new ReservationOverallMartQueryService(martRepository, systemMartRepository, homepageRepository);
    }

    @Test
    void 컷오버_이전_달은_마트_값을_그대로_쓴다() {
        ReservationOverallMonthlyItem dec2025 = monthOf(service().getMonthlyStats(List.of(2025, 2026)), 2025, 12);

        assertThat(dec2025.getOnline()).isEqualTo(200);
        assertThat(dec2025.getCall()).isEqualTo(100);
        assertThat(dec2025.getReservations()).isEqualTo(300);
    }

    @Test
    void 컷오버_이후_온라인은_네이버_카카오_홈페이지_실시간_합이다() {
        ReservationOverallMonthlyItem june = monthOf(service().getMonthlyStats(List.of(2026)), 2026, 6);

        assertThat(june.getOnline()).isEqualTo(50 + 12 + 202);  // 264 — 마트의 222 가 아니다
    }

    @Test
    void 컷오버_이후_콜은_인콜_TM_재상담_예약수_실시간_합이다() {
        ReservationOverallMonthlyItem june = monthOf(service().getMonthlyStats(List.of(2026)), 2026, 6);

        assertThat(june.getCall()).isEqualTo(40 + 25 + 8);  // 73 — 마트의 111 이 아니다
    }

    @Test
    void 컷오버_이후_종합은_라이브_콜과_라이브_온라인의_합이다() {
        ReservationOverallMonthlyItem june = monthOf(service().getMonthlyStats(List.of(2026)), 2026, 6);

        assertThat(june.getReservations()).isEqualTo(73 + 264);  // 337 — 마트의 333 이 아니다
        assertThat(june.getTotal()).isEqualTo(337);
    }

    @Test
    void 홈페이지_스냅샷_커버리지_밖은_온라인과_종합이_null_이지만_콜은_유지된다() {
        // 5/10 까지만 담긴 스냅샷 → 5월도 부분 → coverage = 4월 → 6월은 4월 이후이므로 online null.
        when(homepageRepository.findLastRegDate()).thenReturn("2026-05-10 16:15:55");

        ReservationOverallMonthlyItem june = monthOf(service().getMonthlyStats(List.of(2026)), 2026, 6);

        assertThat(june.getOnline()).isNull();
        assertThat(june.getReservations()).isNull();
        assertThat(june.getCall()).isEqualTo(73);  // 콜은 시스템 마트만 참조하므로 홈페이지 커버리지와 무관
    }

    @Test
    void 시스템_마트에_없는_달은_콜과_온라인_모두_0_으로_합산한다() {
        when(systemMartRepository.findMonthlyChannelReservationSums(anyString(), anyString())).thenReturn(List.of());

        ReservationOverallMonthlyItem june = monthOf(service().getMonthlyStats(List.of(2026)), 2026, 6);

        assertThat(june.getOnline()).isEqualTo(202);  // 0 + 0 + 202
        assertThat(june.getCall()).isZero();          // 0 + 0 + 0
        assertThat(june.getReservations()).isEqualTo(202);
    }

    @Test
    void 미래_월은_모두_null_이다() {
        // 서비스가 12개월 x 연도로 채우므로, 미래 월도 리스트에 담기지만 값은 null.
        // 이 테스트는 clock 이 12월 이전이라야 유의미 — currentMonth 이후 달을 골라 확인.
        java.time.YearMonth futureMonth = java.time.YearMonth.now().plusMonths(6);

        List<ReservationOverallMonthlyItem> items = service().getMonthlyStats(List.of(futureMonth.getYear()));
        ReservationOverallMonthlyItem future = monthOf(items, futureMonth.getYear(), futureMonth.getMonthValue());

        assertThat(future.getOnline()).isNull();
        assertThat(future.getCall()).isNull();
        assertThat(future.getReservations()).isNull();
    }

    @Test
    void 컷오버_이전_연도만_조회하면_실시간_소스에_붙지_않는다() {
        when(martRepository.findMonthly(anyList())).thenReturn(List.of(
                ReservationOverallMonthlyItem.builder()
                        .year(2025).month(12).reservations(2209).online(975).call(1234).total(2209).build()
        ));

        ReservationOverallMonthlyItem dec = monthOf(service().getMonthlyStats(List.of(2025)), 2025, 12);

        assertThat(dec.getOnline()).isEqualTo(975);
        assertThat(dec.getCall()).isEqualTo(1234);
        verify(systemMartRepository, never()).findMonthlyChannelReservationSums(anyString(), anyString());
        verify(homepageRepository, never()).findMonthlyListRawCounts(anyString(), anyString());
        verify(homepageRepository, never()).findLastRegDate();
    }
}
