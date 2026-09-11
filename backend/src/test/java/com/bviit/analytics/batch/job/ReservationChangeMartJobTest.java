package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import com.bviit.analytics.reservation.dto.ReservationChangeRow;
import com.bviit.analytics.reservation.repository.ReservationChangeHistoryRepository;
import com.bviit.analytics.reservation.service.ReservationChangeChainBuilder.HistoryStep;
import com.bviit.analytics.reservation.service.ReservationChangeChainBuilder.Source;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 예약 변경이력 배치 잡의 관측 카운터 규칙을 못 박는다 (2026-09-11 H1 관측성 강화 후속).
 *
 * 왜 잠가두나 — {@code historyTimeFail·recovered·timeLost·totalSteps} 카운트가 조용히 어긋나면
 * (a) 시각 미상 알림이 안 뜨거나(과소 경보) (b) 정상 fallback 인데 SLA 위반으로 오인(과대 경보) 한다.
 * MartJob 자체는 스프링 컨텍스트 없이 mock 3종으로 검증한다 (Repository·Writer·SuccessLog).
 */
class ReservationChangeMartJobTest {

    private ReservationChangeHistoryRepository historyRepository;
    private ReservationChangeMartWriter writer;
    private BatchSuccessLogRepository successLogRepository;
    private ReservationChangeMartJob job;

    @BeforeEach
    void setUp() {
        historyRepository = mock(ReservationChangeHistoryRepository.class);
        writer = mock(ReservationChangeMartWriter.class);
        successLogRepository = mock(BatchSuccessLogRepository.class);
        job = new ReservationChangeMartJob(historyRepository, writer, successLogRepository);
        // @Value 는 스프링 컨텍스트에서만 주입되므로 직접 설정 — 프로덕션 기본값 5 와 동일.
        ReflectionTestUtils.setField(job, "timeLostLogSamples", 5);
        // Writer.upsert 는 int 리턴 — mock 기본 0 이라 assertion 시 upserted 는 0 이 나오지만 카운터 검증에는 무관.
        when(writer.upsert(anyList())).thenReturn(0);
    }

    /** 예약 1건 + 그 예약의 이력들을 consumer 에 넘기는 mock 을 준비. */
    private void mockReservations(Source... sources) {
        doAnswer(inv -> {
            @SuppressWarnings("unchecked")
            Consumer<Source> consumer = inv.getArgument(2);
            for (Source s : sources) consumer.accept(s);
            return sources.length;
        }).when(historyRepository).forEachReservation(anyString(), anyString(), any());
    }

    private static Source src(String num, HistoryStep... steps) {
        return new Source(num, "C" + num, "홍길동", "M", "Y", "2026-09-30", "2026-09-01 09:00", List.of(steps));
    }

    // ── 정상 케이스 (파싱 성공) ─────────────────────────────

    @Test
    void 정상_이력만_있으면_실패_카운터가_모두_0이다() {
        mockReservations(src("R1",
                new HistoryStep("2026-09-01 09:00:00", "260901090000001", "2026-09-15"),
                new HistoryStep("2026-09-05 14:00:00", "260905140000001", "2026-09-20")));

        Map<String, Integer> result = job.run(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30));

        assertThat(result).containsEntry("history_time_fail", 0);
        assertThat(result).containsEntry("history_time_recovered", 0);
        assertThat(result).containsEntry("history_time_lost", 0);
    }

    // ── HISTORY_NUM fallback (복구 성공) ────────────────────

    @Test
    void HISTORY_TIME_파싱_실패해도_HISTORY_NUM으로_복구되면_recovered로_잡힌다() {
        mockReservations(src("R2",
                // 알 수 없는 포맷이지만 HISTORY_NUM 앞 12자리(yyMMddHHmmss) 는 유효
                new HistoryStep("garbage-format", "260901090000001", "2026-09-15"),
                new HistoryStep("도-알-수-없-음", "260905140000001", "2026-09-20")));

        Map<String, Integer> result = job.run(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30));

        assertThat(result.get("history_time_fail")).isEqualTo(2);
        assertThat(result.get("history_time_recovered")).isEqualTo(2);   // 두 스텝 모두 HISTORY_NUM 으로 복구
        assertThat(result.get("history_time_lost")).isZero();
    }

    // ── 시각 미상 (둘 다 실패) ─────────────────────────────

    @Test
    void HISTORY_TIME과_HISTORY_NUM_둘_다_실패하면_lost로_잡힌다() {
        mockReservations(src("R3",
                new HistoryStep("garbage", "invalid-num", "2026-09-15"),
                new HistoryStep("bad", "another-invalid", "2026-09-20")));

        Map<String, Integer> result = job.run(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30));

        assertThat(result.get("history_time_fail")).isEqualTo(2);
        assertThat(result.get("history_time_recovered")).isZero();
        assertThat(result.get("history_time_lost")).isEqualTo(2);
    }

    // ── 빈 HISTORY_TIME 은 실패로 카운트 안 함 ──────────────

    @Test
    void HISTORY_TIME이_빈문자열이면_실패_카운터에_안_들어간다() {
        // 원래 시각이 없는 경우(RESERVE_HISTORY.HISTORY_TIME IS NULL 등) 는 정상 · 파싱 실패 아님.
        mockReservations(src("R4",
                new HistoryStep("", "260901090000001", "2026-09-15"),
                new HistoryStep("   ", "260905140000001", "2026-09-20")));   // 공백만 있는 것도 동일

        Map<String, Integer> result = job.run(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30));

        assertThat(result.get("history_time_fail")).isZero();
        assertThat(result.get("history_time_recovered")).isZero();
        assertThat(result.get("history_time_lost")).isZero();
    }

    // ── list_reservation_change upserted 반환 ──────────────

    @Test
    void 유효한_예약은_writer로_flush되고_upserted_카운트가_반환된다() {
        // Writer 가 upserted 를 리턴하는 시나리오 — mock 이 값을 지정하면 잡이 그대로 합계에 실는다.
        when(writer.upsert(anyList())).thenReturn(1);   // 배치 flush 1건, 최종 flush 0건
        mockReservations(src("R5",
                new HistoryStep("2026-09-01 09:00:00", "260901090000001", "2026-09-15"),
                new HistoryStep("2026-09-05 14:00:00", "260905140000001", "2026-09-20")));

        Map<String, Integer> result = job.run(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30));

        // FLUSH_SIZE(1000) 미달이라 write 는 1번만 (최종 flush), buffer 1건 → writer 리턴 1건.
        assertThat(result.get("list_reservation_change")).isEqualTo(1);
    }

    // ── 빈 배치 ────────────────────────────────────────────

    @Test
    void 대상_예약이_없어도_안전하게_0을_반환한다() {
        mockReservations();   // 아무 예약도 없음

        Map<String, Integer> result = job.run(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30));

        assertThat(result.get("list_reservation_change")).isZero();
        assertThat(result.get("history_time_fail")).isZero();
        assertThat(result.get("history_time_lost")).isZero();
        // successLogRepository.upsert 는 호출됨 (배치 성공 표시).
        org.mockito.Mockito.verify(successLogRepository).upsert(eq("reservation-change"), eq(LocalDate.of(2026, 9, 30)));
    }
}
