package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationChangeRow;
import com.bviit.analytics.reservation.service.ReservationChangeChainBuilder.HistoryStep;
import com.bviit.analytics.reservation.service.ReservationChangeChainBuilder.Source;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationChangeChainBuilderTest {

    private static Source source(String reserveNum, String finalDate, String insertedAt, HistoryStep... history) {
        return new Source(reserveNum, "2232496 ", "황다예", "M", "I", finalDate, insertedAt, List.of(history));
    }

    @Test
    void 예약일이_바뀐_이력만_스텝으로_접고_연속_중복은_합친다() {
        Optional<ReservationChangeRow> row = ReservationChangeChainBuilder.build(source(
                "2606241142000000000001", "2026-07-06", "2026-06-24 11:42",
                new HistoryStep("2026-06-24 11:42:10.000", "2026-09-01"),
                new HistoryStep("2026-06-24 11:42:11.000", "2026-09-01"),   // 같은 예약일 재저장 — 스텝 아님
                new HistoryStep("2026-06-29 12:28:00.000", "2026-07-06"),
                new HistoryStep("2026-06-29 12:29:00.000", "")               // 예약일 빈 이력 — 건너뜀
        ));

        assertThat(row).isPresent();
        ReservationChangeRow r = row.get();
        assertThat(r.changeCount()).isEqualTo(1);
        assertThat(r.firstDate()).isEqualTo("2026-09-01");
        assertThat(r.finalDate()).isEqualTo("2026-07-06");
        assertThat(r.changeChain()).isEqualTo("2026-06-24 11:42@2026-09-01|2026-06-29 12:28@2026-07-06");
        assertThat(r.lastChangedAt()).isEqualTo("2026-06-29 12:28");
        assertThat(r.chartNo()).isEqualTo("2232496");
    }

    @Test
    void 왕복_변경은_두_번으로_센다() {
        Optional<ReservationChangeRow> row = ReservationChangeChainBuilder.build(source(
                "2606241613000000000001", "2026-07-10", "",
                new HistoryStep("2026-06-24 16:13:00", "2026-06-24"),
                new HistoryStep("2026-06-24 16:13:30", "2026-07-17"),
                new HistoryStep("2026-07-06 11:32:00", "2026-06-24")
        ));

        assertThat(row).isPresent();
        assertThat(row.get().changeCount()).isEqualTo(2);
        // 최종 예약일은 RESERVATION 현재값을 믿는다(마지막 스텝 06-24 가 아니라 07-10)
        assertThat(row.get().finalDate()).isEqualTo("2026-07-10");
    }

    @Test
    void 변경이_없어도_changeCount_0_으로_싣고_유효한_예약일이_없으면_버린다() {
        ReservationChangeRow unchanged = ReservationChangeChainBuilder.build(source(
                "2606240001000000000001", "2026-07-01", "2026-06-24 09:00",
                new HistoryStep("2026-06-24 09:00:00", "2026-07-01"),
                new HistoryStep("2026-06-25 09:00:00", "2026-07-01")
        )).orElseThrow();
        assertThat(unchanged.changeCount()).isZero();
        assertThat(unchanged.changeChain()).isEqualTo("2026-06-24 09:00@2026-07-01");
        assertThat(unchanged.firstDate()).isEqualTo("2026-07-01");
        assertThat(ReservationChangeChainBuilder.build(source("2606240001000000000001", "", ""))).isEmpty();
        assertThat(ReservationChangeChainBuilder.build(source("2606240001000000000001", "2026-07-01", "",
                new HistoryStep("2026-06-24 09:00:00", "")))).isEmpty();
    }

    @Test
    void 등록일은_이력_첫_저장시각_등록시각_채번일_순으로_정한다() {
        ReservationChangeRow byHistory = ReservationChangeChainBuilder.build(source(
                "2606240001000000000001", "2026-07-02", "2026-06-23 10:00",
                new HistoryStep("2026-06-24 11:42:00", "2026-07-01"),
                new HistoryStep("2026-06-25 08:00:00", "2026-07-02")
        )).orElseThrow();
        assertThat(byHistory.regSource()).isEqualTo("H");
        assertThat(byHistory.registeredAt()).isEqualTo("2026-06-24");
        assertThat(byHistory.registeredTime()).isEqualTo("11:42");

        ReservationChangeRow byInserted = ReservationChangeChainBuilder.build(source(
                "2606240001000000000001", "2026-07-02", "2026-06-23 10:05",
                new HistoryStep("이상한값", "2026-07-01"),
                new HistoryStep("", "2026-07-02")
        )).orElseThrow();
        assertThat(byInserted.regSource()).isEqualTo("I");
        assertThat(byInserted.registeredAt()).isEqualTo("2026-06-23");
        assertThat(byInserted.registeredTime()).isEqualTo("10:05");
        // 시각을 못 읽은 스텝은 시각이 빈다
        assertThat(byInserted.changeChain()).isEqualTo("@2026-07-01|@2026-07-02");

        ReservationChangeRow byNumber = ReservationChangeChainBuilder.build(source(
                "2201010930000000000001", "2022-02-07", "",
                new HistoryStep("", "2022-02-12"),
                new HistoryStep("", "2022-02-07")
        )).orElseThrow();
        assertThat(byNumber.regSource()).isEqualTo("N");
        assertThat(byNumber.registeredAt()).isEqualTo("2022-01-01");
        assertThat(byNumber.registeredTime()).isEmpty();
    }

    @Test
    void 채번일도_날짜꼴이_아니면_버린다() {
        assertThat(ReservationChangeChainBuilder.build(source(
                "ABCDEF", "2022-02-07", "",
                new HistoryStep("", "2022-02-12"),
                new HistoryStep("", "2022-02-07")
        ))).isEmpty();
    }

    @Test
    void HISTORY_TIME_을_못_읽으면_HISTORY_NUM_채번_시각을_쓴다() {
        ReservationChangeRow row = ReservationChangeChainBuilder.build(source(
                "2602011057345500@AL0024", "2026-09-01", "",
                new HistoryStep("2026. 2. 1. 오전 10:57:34", "260201105734550@AL0024", "2026-08-02"),
                new HistoryStep("", "260731094401123@BS1000", "2026-08-16"),
                new HistoryStep("2026-08-10 10:48:12.000", "260810104812000@BS1000", "2026-09-01")
        )).orElseThrow();
        assertThat(row.regSource()).isEqualTo("H");
        assertThat(row.registeredAt()).isEqualTo("2026-02-01");
        assertThat(row.registeredTime()).isEqualTo("10:57");
        assertThat(row.changeChain()).isEqualTo("2026-02-01 10:57@2026-08-02|2026-07-31 09:44@2026-08-16|2026-08-10 10:48@2026-09-01");
        assertThat(ReservationChangeChainBuilder.parseHistoryNum("ABC")).isEmpty();
        assertThat(ReservationChangeChainBuilder.parseHistoryNum("261399000000@X")).isEmpty(); // 13월 — 형식은 맞지만 날짜가 아님
    }

    @Test
    void 시각_형식이_섞여도_읽는다() {
        assertThat(ReservationChangeChainBuilder.parseTime("2026-06-24 11:42:10.1234567")).isPresent();
        assertThat(ReservationChangeChainBuilder.parseTime("2026-06-24 11:42:10")).isPresent();
        assertThat(ReservationChangeChainBuilder.parseTime("2026-06-24T11:42:10")).isPresent();
        assertThat(ReservationChangeChainBuilder.parseTime("202606241142")).isPresent();
        // MSSQL style 100 (의사랑 연동이 쓰는 형식) — 공백 패딩 · 12시간제
        assertThat(ReservationChangeChainBuilder.parseTime("09  4 2026  1:58PM")).contains(java.time.LocalDateTime.of(2026, 9, 4, 13, 58));
        assertThat(ReservationChangeChainBuilder.parseTime("09  1 2026 10:31AM")).contains(java.time.LocalDateTime.of(2026, 9, 1, 10, 31));
        assertThat(ReservationChangeChainBuilder.parseTime("12 25 2026 12:05AM")).contains(java.time.LocalDateTime.of(2026, 12, 25, 0, 5));
        assertThat(ReservationChangeChainBuilder.parseTime("예약저장")).isEmpty();
        assertThat(ReservationChangeChainBuilder.parseTime(null)).isEmpty();
    }
}
