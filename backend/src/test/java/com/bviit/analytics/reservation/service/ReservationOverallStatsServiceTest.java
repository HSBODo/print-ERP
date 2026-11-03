package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import com.bviit.analytics.reservation.repository.ReservationListHomepageRepository;
import com.bviit.analytics.reservation.repository.ReservationOverallStatsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 온라인 예약 정의 전환(2026-06) 계약.
 *
 * <pre>
 *   2024·2025    : 온라인 = 기존 SQL 의 online_cnt (홈페이지/앱 + 네이버, 카카오 미포함)
 *   2026-01 ~ 05 : V24 골든 시드 (여기서는 배치 서비스 관점이라 기존 online_cnt 그대로 계산)
 *   2026-06 ~    : 온라인 = 네이버 + 카카오톡 + 홈페이지(리스트 화면과 동일한 raw · 전 진료)
 *                  종합   = 콜 + 새 온라인
 * </pre>
 *
 * MSSQL·레거시 소스에 붙지 않고 합산 규칙만 고정한다(실 쿼리는 SqlResourceTest 가 본다).
 */
class ReservationOverallStatsServiceTest {

    private ReservationOverallStatsRepository repository;
    private ReservationListHomepageRepository homepageRepository;

    /** 기존 SQL: 2025-12 → call 100 / online 200 / total 300 (컷오버 이전), 2026-06 → call 111 / online 222 / total 333 (컷오버 이후 라이브로 덮여야) */
    private static List<Map<String, Object>> overallRows() {
        return List.of(
                Map.of("yr", 2025, "mo", 12, "cnt", 300, "online_cnt", 200, "call_cnt", 100),
                Map.of("yr", 2026, "mo", 6, "cnt", 333, "online_cnt", 222, "call_cnt", 111)
        );
    }

    private static ReservationOverallMonthlyItem monthOf(List<ReservationOverallMonthlyItem> items, int year, int month) {
        return items.stream().filter(i -> i.getYear() == year && i.getMonth() == month).findFirst().orElseThrow();
    }

    @BeforeEach
    void setUp() {
        repository = mock(ReservationOverallStatsRepository.class);
        homepageRepository = mock(ReservationListHomepageRepository.class);

        when(repository.findReservationOverallMonthly(anyString(), anyString())).thenReturn(overallRows());
        when(repository.findNaverMonthly(anyString(), anyString()))
                .thenReturn(List.of(Map.of("yr", 2026, "mo", 6, "naver_cnt", 50)));
        when(repository.findKakaoMonthly(anyString(), anyString()))
                .thenReturn(List.of(Map.of("yr", 2026, "mo", 6, "kakao_cnt", 12)));
        when(homepageRepository.findMonthlyListRawCounts(anyString(), anyString()))
                .thenReturn(List.of(Map.of("yr", 2026, "mo", 6, "cnt", 202)));
        // 스냅샷이 7/10 까지 → 온전히 커버하는 마지막 달은 6월
        when(homepageRepository.findLastRegDate()).thenReturn("2026-07-10 16:15:55");
    }

    private ReservationOverallStatsService service() {
        return new ReservationOverallStatsService(repository, Optional.of(homepageRepository));
    }

    @Test
    void 컷오버_이전_달은_기존_공식을_그대로_쓴다() {
        ReservationOverallMonthlyItem dec2025 = monthOf(service().getMonthlyStats(List.of(2025, 2026)), 2025, 12);

        assertThat(dec2025.getOnline()).isEqualTo(200);   // 컷오버 이전이라 기존 online_cnt 그대로
        assertThat(dec2025.getCall()).isEqualTo(100);
        assertThat(dec2025.getReservations()).isEqualTo(300);
    }

    @Test
    void 컷오버_달부터_온라인은_네이버_카카오_홈페이지_합이다() {
        ReservationOverallMonthlyItem june = monthOf(service().getMonthlyStats(List.of(2026)), 2026, 6);

        assertThat(june.getOnline()).isEqualTo(50 + 12 + 202);  // 264 — 기존 online_cnt 222 가 아니다
    }

    @Test
    void 컷오버_달부터_종합은_콜과_새_온라인의_합이다() {
        ReservationOverallMonthlyItem june = monthOf(service().getMonthlyStats(List.of(2026)), 2026, 6);

        assertThat(june.getReservations()).isEqualTo(111 + 264);  // 375 — 기존 cnt 333 이 아니다
        assertThat(june.getTotal()).isEqualTo(375);
        assertThat(june.getCall()).isEqualTo(111);  // 콜은 안 바뀐다
    }

    @Test
    void 과거의_부분_월은_null_이다() {
        // 정책: 과거 달은 말일까지 담긴 경우에만 인정 — 부분 과거 월은 배제한다.
        // (현재 진행 중인 달은 별도로 부분값 노출 — coverageMonth 의 YearMonth.now() 분기)
        //
        // 5/10 까지만 담긴 스냅샷 → 5월도 부분 → coverage = 4월 → 6월은 4월 이후이므로 null.
        // 이 시나리오는 실제 clock 이 어느 달이든 성립한다(5월도, 6월도 결과가 같음).
        when(homepageRepository.findLastRegDate()).thenReturn("2026-05-10 16:15:55");

        ReservationOverallMonthlyItem june = monthOf(service().getMonthlyStats(List.of(2026)), 2026, 6);

        assertThat(june.getOnline()).isNull();
        assertThat(june.getReservations()).isNull();
    }

    @Test
    void 스냅샷이_말일까지_담으면_그_달은_계산한다() {
        when(homepageRepository.findLastRegDate()).thenReturn("2026-06-30 23:48:13");

        assertThat(monthOf(service().getMonthlyStats(List.of(2026)), 2026, 6).getOnline()).isEqualTo(264);
    }

    @Test
    void 홈페이지_소스가_없으면_조용히_계산하지_않고_실패한다() {
        ReservationOverallStatsService noHomepage =
                new ReservationOverallStatsService(repository, Optional.empty());

        // 홈페이지 몫(202)이 빠진 62 를 마트에 적재하는 게 최악이다 — 차라리 터뜨린다.
        assertThatThrownBy(() -> noHomepage.getMonthlyStats(List.of(2026)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("mart_list_reservation_homepage");
    }

    @Test
    void 소스마다_기간_상한_규약이_달라_to_를_형식별로_넘긴다() {
        service().getMonthlyStats(List.of(2026));

        // MSSQL 소스: InsertedDateTime <= :to → 그날 마지막 시각까지 포함해야 한다.
        verify(repository).findReservationOverallMonthly("2026-01-01", "2026-12-31 23:59:59");
        // warehouse 홈페이지 소스: reg_date < (CAST(:to AS date) + INTERVAL '1 day') 반개구간 → '날짜'여야 한다.
        // 시각이 붙은 값을 넘기면 CAST 가 실패하거나 다음 해 1/1 이 딸려오므로 날짜만 분리해 넘긴다.
        verify(homepageRepository).findMonthlyListRawCounts("2026-01-01", "2026-12-31");
    }

    @Test
    void 컷오버_이전_연도만_조회하면_레거시_소스가_없어도_동작한다() {
        when(repository.findReservationOverallMonthly(anyString(), anyString()))
                .thenReturn(List.of(Map.of("yr", 2025, "mo", 12, "cnt", 2209, "online_cnt", 975, "call_cnt", 1234)));
        ReservationOverallStatsService noHomepage =
                new ReservationOverallStatsService(repository, Optional.empty());

        List<ReservationOverallMonthlyItem> items = noHomepage.getMonthlyStats(List.of(2025));

        assertThat(items.stream()
                .filter(i -> i.getYear() == 2025 && i.getMonth() == 12)
                .findFirst().orElseThrow().getOnline()).isEqualTo(975);
        // 불필요한 쿼리도 날리지 않는다
        verify(repository, never()).findNaverMonthly(anyString(), anyString());
        verify(repository, never()).findKakaoMonthly(anyString(), anyString());
    }
}
