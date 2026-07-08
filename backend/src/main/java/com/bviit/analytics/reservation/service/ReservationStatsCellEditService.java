package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationStatsCellEdit;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsSnapshot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * 예약통계시스템(시력교정) — 확정 스냅샷의 특정 일자 온라인예약 원시 카운트 셀을 손보정한다.
 *
 * 홈페이지/네이버 온라인예약 카운트(homeReceived·homeReservation·naverReceived·naverRejected·
 * naverValid·naverReservation)는 RESERVATION 등록일 기반이라 후행 재수집·상태변경·이벤트 누락으로
 * 라이브 재조회 시 값이 어긋날 수 있다. 그럴 때 PDF/레거시 값을 화면에서 직접 채워 넣는 경로.
 *
 * 수정 가능 필드는 홈+네이버 원시 카운트 6개로 한정(파생값·다른 채널 제외). 파일 I/O뿐이라 프로파일
 * 무관이며, 라이브 자동 채움(fill)과의 경합을 막기 위해 월 단위 락 안에서 read-modify-write 한다.
 */
@Service
@RequiredArgsConstructor
public class ReservationStatsCellEditService {

    /** 손보정 허용 필드 — 온라인예약(홈+네이버) 원시 카운트 6개. */
    static final Set<String> EDITABLE_FIELDS = Set.of(
            "homeReceived", "homeReservation",
            "naverReceived", "naverRejected", "naverValid", "naverReservation"
    );
    private static final int MAX_VALUE = 100_000;

    private final ReservationStatsSnapshotStore snapshotStore;
    private final ReservationStatsPeriodLock periodLock;

    /**
     * 해당 월 스냅샷의 date 일자 field 값을 value로 바꾸고 수정 이력을 남긴다.
     * locked(PDF 고정) 월도 손보정은 허용한다 — 값 정정이 바로 그 용도이며, 이력으로 추적된다.
     *
     * @return 갱신된 일자 row(수정 이력 포함)
     */
    public ReservationStatsDailyRow editCell(String period, String date, String field, int value, String editedBy) {
        if (!EDITABLE_FIELDS.contains(field)) {
            throw new IllegalArgumentException("수정할 수 없는 필드입니다: " + field);
        }
        if (value < 0 || value > MAX_VALUE) {
            throw new IllegalArgumentException("값은 0 이상 " + MAX_VALUE + " 이하여야 합니다: " + value);
        }
        if (date == null || !date.startsWith(period + "-")) {
            throw new IllegalArgumentException("일자가 해당 월에 속하지 않습니다: date=" + date + ", period=" + period);
        }
        String by = editedBy == null || editedBy.isBlank() ? "unknown" : editedBy;
        String at = LocalDateTime.now().toString();

        return periodLock.withPeriodLock(period, () -> {
            ReservationStatsSnapshot snapshot = snapshotStore.find(period)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "스냅샷이 없어 수정할 수 없습니다. 먼저 조회/확정하세요: " + period));

            List<ReservationStatsDailyRow> days = new ArrayList<>(snapshot.days());
            int idx = indexOfDate(days, date);
            if (idx < 0) {
                throw new IllegalArgumentException("해당 일자가 스냅샷에 없습니다: " + date);
            }

            ReservationStatsDailyRow updated = applyEdit(days.get(idx), field, value,
                    new ReservationStatsCellEdit(field, value, by, at));
            days.set(idx, updated);

            snapshotStore.save(new ReservationStatsSnapshot(
                    snapshot.period(), snapshot.confirmedAt(), snapshot.confirmedBy(),
                    snapshot.locked(), days, snapshot.schemaVersion()));
            return updated;
        });
    }

    private static int indexOfDate(List<ReservationStatsDailyRow> days, String date) {
        for (int i = 0; i < days.size(); i++) {
            if (date.equals(days.get(i).date())) return i;
        }
        return -1;
    }

    /** date row의 field 값을 바꾸고, 같은 필드 기존 이력은 교체(필드당 최신 1건 유지). */
    private static ReservationStatsDailyRow applyEdit(
            ReservationStatsDailyRow d, String field, int value, ReservationStatsCellEdit edit) {
        int homeReceived = "homeReceived".equals(field) ? value : d.homeReceived();
        int homeReservation = "homeReservation".equals(field) ? value : d.homeReservation();
        int naverReceived = "naverReceived".equals(field) ? value : d.naverReceived();
        int naverRejected = "naverRejected".equals(field) ? value : d.naverRejected();
        int naverValid = "naverValid".equals(field) ? value : d.naverValid();
        int naverReservation = "naverReservation".equals(field) ? value : d.naverReservation();

        List<ReservationStatsCellEdit> edits = new ArrayList<>();
        for (ReservationStatsCellEdit e : d.manualEdits()) {
            if (!e.field().equals(field)) edits.add(e);
        }
        edits.add(edit);

        return new ReservationStatsDailyRow(
                d.date(),
                d.inboundCall(), d.answeredCall(), d.newInquiry(), d.callReservation(),
                d.tmTotalDb(), d.tmValidDb(), d.tmReservation(),
                d.tmRecounsel(), d.tmRecounselValid(), d.tmRecounselReservation(),
                homeReceived, homeReservation,
                naverReceived, naverRejected, naverValid, naverReservation,
                d.kakaoInquiry(), d.kakaoReservation(),
                d.cancelCallNaver(), d.cancelHome(), d.cancelKakao(),
                d.visit(), d.noShowReservation(), d.cancel(),
                edits);
    }
}
