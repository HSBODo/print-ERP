package com.bviit.analytics.report.service;

import com.bviit.analytics.consultation.repository.ConsultationRateBridgeRepository;
import com.bviit.analytics.overall.repository.OverallExamWeeklyRepository;
import com.bviit.analytics.report.dto.WeeklyReportItem;
import com.bviit.analytics.report.repository.WeeklyReportRepository;
import com.bviit.analytics.reservation.repository.HomepageOverallSource;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.service.SurgeryStatsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 주차 레포트 — ISO 주차 버킷팅/파생 규칙 검증.
 * 일별 SQL 자체(월별과의 정합)는 운영 DB 대조로 확인했고, 여기서는 자바 집계 규칙만 본다.
 */
class WeeklyReportServiceTest {

    private WeeklyReportRepository repository;
    private OverallExamWeeklyRepository overallRepository;
    private SurgeryStatsService surgeryStatsService;
    private HomepageOverallSource homepageRepository;
    private ConsultationRateBridgeRepository bridgeRepository;

    @BeforeEach
    void setUp() {
        repository = mock(WeeklyReportRepository.class);
        overallRepository = mock(OverallExamWeeklyRepository.class);
        surgeryStatsService = mock(SurgeryStatsService.class);
        homepageRepository = mock(HomepageOverallSource.class);
        bridgeRepository = mock(ConsultationRateBridgeRepository.class);

        when(repository.findReservationOverallDaily(anyString(), anyString())).thenReturn(List.of());
        when(repository.findReservationNaverDaily(anyString(), anyString())).thenReturn(List.of());
        when(repository.findReservationKakaoDaily(anyString(), anyString())).thenReturn(List.of());
        when(repository.findCataractExamDaily(anyString(), anyString())).thenReturn(List.of());
        when(repository.findOutpatientDaily(anyString(), anyString())).thenReturn(List.of());
        when(repository.findVisionRatesDaily(anyString(), anyString())).thenReturn(List.of());
        when(overallRepository.findDemographicsDaily(anyString(), anyString())).thenReturn(List.of());
        when(overallRepository.findVisionDaily(anyString(), anyString())).thenReturn(List.of());
        when(overallRepository.findCataractDaily(anyString(), anyString())).thenReturn(List.of());
        when(overallRepository.findOneDayDaily(anyString(), anyString())).thenReturn(List.of());
        when(overallRepository.findStopCountDaily(anyString(), anyString())).thenReturn(List.of());
        when(surgeryStatsService.getDailyStats(anyString(), anyString())).thenReturn(List.of());
        when(homepageRepository.findDailyListRawCounts(anyString(), anyString())).thenReturn(List.of());
        when(homepageRepository.findLastRegDate()).thenReturn("");
    }

    private WeeklyReportService service() {
        // exam/surgery Agg 리포지토리는 비움 — 마트 없는(mssql 단독) 경로를 검증한다.
        // 마트 경로는 검사 지표를 v_all_exam_list, 수술 지표를 v_all_surgery_list 에서 뽑으며
        // 통합 대조로 확인한다(주차합 = 일별 마트합 = 월별).
        return new WeeklyReportService(repository, overallRepository, surgeryStatsService,
                Optional.of(homepageRepository), Optional.empty(), Optional.empty(), Optional.empty(),
                bridgeRepository);
    }

    @Test
    @DisplayName("ISO 주차 경계 — 2026-01-01(목)은 1주차, 1주차 시작일은 전년 12/29")
    void iso_주차_경계() {
        when(overallRepository.findVisionDaily(anyString(), anyString())).thenReturn(List.of(
                Map.of("d", "2025-12-29", "examCount", 3, "surgeryBooked", 1),
                Map.of("d", "2026-01-01", "examCount", 5, "surgeryBooked", 2),
                Map.of("d", "2026-01-05", "examCount", 7, "surgeryBooked", 0)
        ));

        List<WeeklyReportItem> items = service().getWeeklyStats(List.of(2026));

        assertThat(items).extracting(WeeklyReportItem::getWeek).containsExactly(1, 2);
        WeeklyReportItem first = items.get(0);
        assertThat(first.getStartDate()).isEqualTo("2025-12-29");
        assertThat(first.getEndDate()).isEqualTo("2026-01-04");
        // 전년 12/29 + 1/1 이 같은 1주차로 합쳐진다
        assertThat(first.getVisionExam()).isEqualTo(8);
        assertThat(first.getVisionBooked()).isEqualTo(3);
        assertThat(items.get(1).getVisionExam()).isEqualTo(7);
    }

    @Test
    @DisplayName("조회 대상이 아닌 주차연도(2025-53주)의 날짜는 버린다")
    void 다른_주차연도_제외() {
        when(overallRepository.findStopCountDaily(anyString(), anyString())).thenReturn(List.of(
                Map.of("d", "2026-01-01", "cnt", 4)
        ));

        // 2026-01-01 은 ISO 로 2026-1주차 → years=[2025] 조회에는 잡히지 않아야 한다
        assertThat(service().getWeeklyStats(List.of(2025))).isEmpty();
        assertThat(service().getWeeklyStats(List.of(2026))).hasSize(1);
    }

    @Test
    @DisplayName("값을 건드리지 않은 항목은 null — 0 과 구분된다")
    void 미집계_항목은_null() {
        when(repository.findOutpatientDaily(anyString(), anyString())).thenReturn(List.of(
                Map.of("d", "2026-03-02", "cnt", 120)
        ));

        WeeklyReportItem item = service().getWeeklyStats(List.of(2026)).get(0);

        assertThat(item.getOutpatient()).isEqualTo(120);
        assertThat(item.getVisionExam()).isNull();
        assertThat(item.getCall()).isNull();
        assertThat(item.getReservations()).isNull();
    }

    @Test
    @DisplayName("수술 3종은 일별 항목을 주로 합산한다")
    void 수술_주합산() {
        when(surgeryStatsService.getDailyStats(anyString(), anyString())).thenReturn(List.of(
                SurgeryDailyItem.builder().date("2026-03-02").visionPatients(10).cataractPatients(2).total(13).build(),
                SurgeryDailyItem.builder().date("2026-03-03").visionPatients(6).cataractPatients(1).total(8).build(),
                // 다음 주
                SurgeryDailyItem.builder().date("2026-03-09").visionPatients(4).cataractPatients(0).total(4).build()
        ));

        List<WeeklyReportItem> items = service().getWeeklyStats(List.of(2026));

        assertThat(items).hasSize(2);
        assertThat(items.get(0).getVisionSurgery()).isEqualTo(16);
        assertThat(items.get(0).getCataractSurgery()).isEqualTo(3);
        assertThat(items.get(0).getTotalSurgery()).isEqualTo(21);
        assertThat(items.get(1).getTotalSurgery()).isEqualTo(4);
    }

    @Test
    @DisplayName("컷오버 이전 주 — 온라인은 RESERVE_PATH 기준값, 종합 = 콜 + 온라인")
    void 컷오버_이전_온라인() {
        when(repository.findReservationOverallDaily(anyString(), anyString())).thenReturn(List.of(
                Map.of("d", "2026-03-02", "cnt", 30, "online_cnt", 10, "call_cnt", 20),
                Map.of("d", "2026-03-03", "cnt", 15, "online_cnt", 5, "call_cnt", 10)
        ));

        WeeklyReportItem item = service().getWeeklyStats(List.of(2026)).get(0);

        assertThat(item.getCall()).isEqualTo(30);
        assertThat(item.getOnline()).isEqualTo(15);
        assertThat(item.getReservations()).isEqualTo(45);
    }

    @Test
    @DisplayName("컷오버 이후 주 — 온라인 = 네이버 + 카카오 + 홈페이지")
    void 컷오버_이후_온라인() {
        when(repository.findReservationOverallDaily(anyString(), anyString())).thenReturn(List.of(
                Map.of("d", "2026-06-01", "cnt", 40, "online_cnt", 12, "call_cnt", 28)
        ));
        when(repository.findReservationNaverDaily(anyString(), anyString())).thenReturn(List.of(
                Map.of("d", "2026-06-01", "naver_cnt", 7)
        ));
        when(repository.findReservationKakaoDaily(anyString(), anyString())).thenReturn(List.of(
                Map.of("d", "2026-06-01", "kakao_cnt", 3)
        ));
        when(homepageRepository.findDailyListRawCounts(anyString(), anyString())).thenReturn(List.of(
                Map.of("d", "2026-06-01", "cnt", 9)
        ));

        WeeklyReportItem item = service().getWeeklyStats(List.of(2026)).stream()
                .filter(it -> "2026-06-01".equals(it.getStartDate()))
                .findFirst().orElseThrow();

        // RESERVE_PATH 기준(12)이 아니라 새 공식(7+3+9)을 쓴다
        assertThat(item.getOnline()).isEqualTo(19);
        assertThat(item.getCall()).isEqualTo(28);
        assertThat(item.getReservations()).isEqualTo(47);
    }

    @Test
    @DisplayName("컷오버 이전 구간만 조회하면 홈페이지 원격 소스를 부르지 않는다")
    void 컷오버_이전만_조회하면_홈페이지_미조회() {
        when(repository.findReservationOverallDaily(anyString(), anyString())).thenReturn(List.of(
                Map.of("d", "2025-03-03", "cnt", 10, "online_cnt", 4, "call_cnt", 6)
        ));

        WeeklyReportItem item = service().getWeeklyStats(List.of(2025)).get(0);

        assertThat(item.getOnline()).isEqualTo(4);
        assertThat(item.getReservations()).isEqualTo(10);
        verify(homepageRepository, never()).findDailyListRawCounts(anyString(), anyString());
    }

    @Test
    @DisplayName("홈페이지 조회 범위는 컷오버 이후로 좁힌다 — 원격 소스를 전 구간 긁지 않는다")
    void 홈페이지_조회범위는_컷오버부터() {
        service().getWeeklyStats(List.of(2025, 2026));

        // 전체 범위는 2024-12-30 ~ 2027-01-03 이지만 홈페이지는 컷오버(2026-06) 부터만 필요하다
        verify(homepageRepository).findDailyListRawCounts("2026-06-01", "2027-01-03");
    }

    @Test
    @DisplayName("홈페이지 소스가 죽어도 나머지 도표는 나오고 온라인·종합만 null")
    void 홈페이지_실패_격리() {
        when(repository.findReservationOverallDaily(anyString(), anyString())).thenReturn(List.of(
                Map.of("d", "2026-06-01", "cnt", 40, "online_cnt", 12, "call_cnt", 28)
        ));
        when(repository.findOutpatientDaily(anyString(), anyString())).thenReturn(List.of(
                Map.of("d", "2026-06-01", "cnt", 100)
        ));
        when(homepageRepository.findDailyListRawCounts(anyString(), anyString()))
                .thenThrow(new IllegalStateException("tunnel down"));

        WeeklyReportItem item = service().getWeeklyStats(List.of(2026)).stream()
                .filter(it -> "2026-06-01".equals(it.getStartDate()))
                .findFirst().orElseThrow();

        assertThat(item.getOnline()).isNull();
        assertThat(item.getReservations()).isNull();
        assertThat(item.getCall()).isEqualTo(28);
        assertThat(item.getOutpatient()).isEqualTo(100);
    }
}
