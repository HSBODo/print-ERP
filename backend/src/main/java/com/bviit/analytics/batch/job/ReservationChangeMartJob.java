package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import com.bviit.analytics.reservation.dto.ReservationChangeRow;
import com.bviit.analytics.reservation.repository.ReservationChangeHistoryRepository;
import com.bviit.analytics.reservation.service.ReservationChangeChainBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 예약 변경이력 마트 적재 잡 — list_reservation_change.
 *
 * <p>범위 의미가 다른 잡들과 다르다. from..to 는 <b>이력이 저장된 기간</b>(RESERVE_HISTORY.HISTORY_TIME)이다.
 * 그 기간에 저장·변경된 검사예약을 골라 이력 전체를 다시 읽고 체인을 새로 접어 reserve_num 으로 upsert 한다.
 * 그래서 매일 D-1 배치가 "어제 바뀐 예약" 을 자연히 흡수하고, 월간 보정은 그 달에 손댄 예약 전부를 다시 쓴다.
 *
 * <p>초기 백필(2022-01~)은 관리자 수동 실행을 월 단위로 나눠 돌린다 — 한 번에 4년치를 읽으면 MSSQL 조회가 길다.
 *
 * <p>변경이 없는 예약(체인 1개)도 change_count=0 으로 싣는다 — 추이 달력의 등록 건수·변경률 분모.
 * 변경 상세 API 는 change_count ≥ 1 만 돌려준다.
 * BatchOrchestrator 의 RESERVATION 도메인 안에서 ReservationMartJob 뒤에 실행된다.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationChangeMartJob {

    static final String MART_NAME = "reservation-change";
    private static final int FLUSH_SIZE = 1000;

    private final ReservationChangeHistoryRepository historyRepository;
    private final ReservationChangeMartWriter writer;
    private final BatchSuccessLogRepository successLogRepository;

    /** 시각 미상(HISTORY_TIME + HISTORY_NUM 모두 실패) 비율이 이 값을 넘으면 log.error → Slack 알림. */
    private static final double TIME_LOST_ERROR_RATE = 0.05;   // 5%

    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("ReservationChangeMartJob start: history range={}..{}", from, to);

        List<ReservationChangeRow> buffer = new ArrayList<>(FLUSH_SIZE);
        int[] upserted = {0};
        int[] skipped = {0};
        int[] historyTimeFail = {0};   // HISTORY_TIME 파싱 실패 (fallback 여부 무관)
        int[] recovered = {0};         // 그 중 HISTORY_NUM 시각으로 복구된 건수
        int[] timeLost = {0};          // 둘 다 실패 → 시각 미상으로 화면에 노출됨
        int[] totalSteps = {0};        // 시각 판정 시도 총 스텝 수 (분모)
        int reservations = historyRepository.forEachReservation(from.toString(), to.toString(), source -> {
            for (ReservationChangeChainBuilder.HistoryStep h : source.history()) {
                String raw = h.historyTime() == null ? "" : h.historyTime().trim();
                if (raw.isEmpty()) continue;   // 원래 시각 없음 — 실패 카운트에 넣지 않음
                totalSteps[0]++;
                if (ReservationChangeChainBuilder.parseTime(raw).isEmpty()) {
                    historyTimeFail[0]++;
                    if (ReservationChangeChainBuilder.parseHistoryNum(h.historyNum()).isPresent()) {
                        recovered[0]++;
                    } else {
                        timeLost[0]++;
                        if (timeLost[0] <= 5) {
                            log.warn("시각 미상 처리(HISTORY_TIME·HISTORY_NUM 모두 실패): reserveNum={} historyNum={} historyTime={}",
                                    source.reserveNum(), h.historyNum(), raw);
                        }
                    }
                }
            }
            ReservationChangeChainBuilder.build(source).ifPresentOrElse(buffer::add, () -> skipped[0]++); // skipped = 유효 예약일 없음
            if (buffer.size() >= FLUSH_SIZE) {
                upserted[0] += writer.upsert(new ArrayList<>(buffer));
                buffer.clear();
            }
        });
        upserted[0] += writer.upsert(buffer);

        successLogRepository.upsert(MART_NAME, to);

        // 시각 미상 비율이 임계치 초과면 log.error → Slack 알림 (LOGGING_SLACK_LEVEL=ERROR)
        double lostRate = totalSteps[0] > 0 ? (double) timeLost[0] / totalSteps[0] : 0.0;
        if (timeLost[0] > 0 && lostRate > TIME_LOST_ERROR_RATE) {
            log.error("시각 미상 비율 임계치 초과 — HISTORY_TIME/HISTORY_NUM 파싱 원본 확인 필요: totalSteps={} timeLost={} rate={}%",
                    totalSteps[0], timeLost[0], String.format("%.2f", lostRate * 100));
        }
        log.info("ReservationChangeMartJob done: reservations={} upserted={} skipped(no valid date)={} " +
                        "historyTimeFail={} recovered={} timeLost={} totalSteps={}",
                reservations, upserted[0], skipped[0], historyTimeFail[0], recovered[0], timeLost[0], totalSteps[0]);

        return Map.of(
                "list_reservation_change", upserted[0],
                // batch_run_log.table_stats 에도 실패 통계를 남긴다 — /admin/batch 화면에서 관측 가능.
                "history_time_fail", historyTimeFail[0],
                "history_time_recovered", recovered[0],
                "history_time_lost", timeLost[0]);
    }
}
