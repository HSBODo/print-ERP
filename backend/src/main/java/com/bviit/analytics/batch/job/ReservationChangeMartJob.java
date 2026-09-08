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
 * <p>변경이 없는 예약(체인 1개)은 마트에 싣지 않는다 — 화면이 "변경된 예약" 목록이라서다.
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

    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("ReservationChangeMartJob start: history range={}..{}", from, to);

        List<ReservationChangeRow> buffer = new ArrayList<>(FLUSH_SIZE);
        int[] upserted = {0};
        int[] skipped = {0};
        int[] unreadableTime = {0};
        int reservations = historyRepository.forEachReservation(from.toString(), to.toString(), source -> {
            // HISTORY_TIME 형식 드리프트 관측 — 못 읽은 원문을 앞 몇 건만 남긴다(HISTORY_NUM 시각으로 대체되므로 실패는 아님).
            for (ReservationChangeChainBuilder.HistoryStep h : source.history()) {
                String raw = h.historyTime() == null ? "" : h.historyTime().trim();
                if (!raw.isEmpty() && ReservationChangeChainBuilder.parseTime(raw).isEmpty()) {
                    unreadableTime[0]++;
                    if (unreadableTime[0] <= 5) {
                        log.warn("HISTORY_TIME 형식을 못 읽음 → HISTORY_NUM 시각 사용: reserveNum={} historyNum={} historyTime={}",
                                source.reserveNum(), h.historyNum(), raw);
                    }
                }
            }
            ReservationChangeChainBuilder.build(source).ifPresentOrElse(buffer::add, () -> skipped[0]++);
            if (buffer.size() >= FLUSH_SIZE) {
                upserted[0] += writer.upsert(new ArrayList<>(buffer));
                buffer.clear();
            }
        });
        upserted[0] += writer.upsert(buffer);

        successLogRepository.upsert(MART_NAME, to);

        log.info("ReservationChangeMartJob done: reservations={} changed(upserted)={} unchanged(skipped)={} unreadableHistoryTime={}",
                reservations, upserted[0], skipped[0], unreadableTime[0]);
        return Map.of("list_reservation_change", upserted[0]);
    }
}
