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
 *   ~ 2026-05 : 온라인 = 기존 SQL 의 online_cnt (홈페이지/앱 + 네이버, 카카오 미포함)
 *   2026-06 ~ : 온라인 = 네이버 + 카카오톡 + 홈페이지(중복제외)
 *               종합   = 콜 + 새 온라인
 * </pre>
 *
 * MSSQL·레거시 소스에 붙지 않고 합산 규칙만 고정한다(실 쿼리는 SqlResourceTest 가 본다).
 */
class ReservationOverallStatsServiceTest {

    private ReservationOverallStatsRepository repository;
    private ReservationListHomepageRepository homepageRepository;

    /** 기존 SQL: 2026-05 → call 100 / online 200 / total 300, 2026-06 → call 111 / online 222 / total 333 */
    private static List<Map<String, Object>> overallRows() {
        return List.of(
                Map.of("yr", 2026, "mo", 5, "cnt", 300, "online_cnt", 200, "call_cnt", 100),
                Map.of("yr", 2026, "mo", 6, "cnt", 333, "online_cnt", 222, "call_cnt", 111)
        );
    }

    private static ReservationOverallMonthlyItem monthOf(List<ReservationOverallMonthlyItem> items, int month) {
        return items.stream().filter(i -> i.getYear() == 2026 && i.getMonth() == month).findFirst().orElseThrow();
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
        when(homepageRepository.findMonthlyDedupedCounts(anyString(), anyString()))
                .thenReturn(List.of(Map.of("yr", 2026, "mo", 6, "cnt", 202)));
        // 스냅샷이 7/10 까지 → 온전히 커버하는 마지막 달은 6월
        when(homepageRepository.findLastRegDate()).thenReturn("2026-07-10 16:15:55");
    }

    private ReservationOverallStatsService service() {
        return new ReservationOverallStatsService(repository, Optional.of(homepageRepository));
    }

    @Test
    void 컷오버_이전_달은_기존_공식을_그대로_쓴다() {
        ReservationOverallMonthlyItem may = monthOf(service().getMonthlyStats(List.of(2026)), 5);

        assertThat(may.getOnline()).isEqualTo(200);   // 네이버+카카오+홈페이지(264)가 아니다
        assertThat(may.getCall()).isEqualTo(100);
        assertThat(may.getReservations()).isEqualTo(300);
    }

    @Test
    void 컷오버_달부터_온라인은_네이버_카카오_홈페이지_합이다() {
        ReservationOverallMonthlyItem june = monthOf(service().getMonthlyStats(List.of(2026)), 6);

        assertThat(june.getOnline()).isEqualTo(50 + 12 + 202);  // 264 — 기존 online_cnt 222 가 아니다
    }

    @Test
    void 컷오버_달부터_종합은_콜과_새_온라인의_합이다() {
        ReservationOverallMonthlyItem june = monthOf(service().getMonthlyStats(List.of(2026)), 6);

        assertThat(june.getReservations()).isEqualTo(111 + 264);  // 375 — 기존 cnt 333 이 아니다
        assertThat(june.getTotal()).isEqualTo(375);
        assertThat(june.getCall()).isEqualTo(111);  // 콜은 안 바뀐다
    }

    @Test
    void 스냅샷이_온전히_담지_못한_달은_0_이_아니라_null_이다() {
        // 7월은 스냅샷이 10일까지만 담고 있다 → 조용히 적은 값 대신 선을 끊는다.
        ReservationOverallMonthlyItem july = monthOf(service().getMonthlyStats(List.of(2026)), 7);

        assertThat(july.getOnline()).isNull();
        assertThat(july.getReservations()).isNull();
    }

    @Test
    void 스냅샷이_말일까지_담으면_그_달은_계산한다() {
        when(homepageRepository.findLastRegDate()).thenReturn("2026-06-30 23:48:13");

        assertThat(monthOf(service().getMonthlyStats(List.of(2026)), 6).getOnline()).isEqualTo(264);
    }

    @Test
    void 레거시_소스가_없으면_조용히_계산하지_않고_실패한다() {
        ReservationOverallStatsService noHomepage =
                new ReservationOverallStatsService(repository, Optional.empty());

        // 홈페이지 몫(202)이 빠진 62 를 마트에 적재하는 게 최악이다 — 차라리 터뜨린다.
        assertThatThrownBy(() -> noHomepage.getMonthlyStats(List.of(2026)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("legacy.datasource.url");
    }

    @Test
    void 소스마다_기간_상한_규약이_달라_to_를_형식별로_넘긴다() {
        service().getMonthlyStats(List.of(2026));

        // MSSQL 소스: InsertedDateTime <= :to → 그날 마지막 시각까지 포함해야 한다.
        verify(repository).findReservationOverallMonthly("2026-01-01", "2026-12-31 23:59:59");
        // 레거시 홈페이지 소스: reg_date < (:to + 1일) 반개구간 → '날짜'여야 한다.
        // 시각이 붙은 값을 넘기면 MariaDB 는 < (2027-01-01 23:59:59) 가 되어 다음 해 1/1 이 딸려오고,
        // SQLite 는 date() 가 시각을 버려 안 딸려온다 — 같은 입력에 소스별로 결과가 갈린다.
        verify(homepageRepository).findMonthlyDedupedCounts("2026-01-01", "2026-12-31");
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
