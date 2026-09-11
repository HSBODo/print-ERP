package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationChangeRow;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * RESERVE_HISTORY 행 묶음 → 예약 변경이력 마트 1행.
 *
 * <p>규칙(디렉팅/예약변경이력 README·기획서 §3·§4 와 동일):
 * <ol>
 *   <li><b>체인</b>: 이력을 저장 순서대로 보며 예약일이 <i>직전 스텝과 달라질 때만</i> 스텝을 추가한다.
 *       A→B→A 는 변경 2회. 예약일이 빈 이력은 건너뛴다.</li>
 *   <li><b>변경 판정</b>: 스텝이 2개 이상이면 "변경된 예약"(changeCount ≥ 1). 스텝 1개면 changeCount 0 으로 싣는다 —
 *       추이 달력의 등록 건수·변경률 분모가 되기 때문. 예약일이 유효한 이력이 하나도 없으면 Optional.empty.</li>
 *   <li><b>등록일 3순위</b>: ① 이력 첫 저장 시각(H) → ② 등록시각 InsertedDateTime(I) → ③ 예약번호 앞 6자리 YYMMDD 채번일(N, 날짜만).</li>
 *   <li><b>최종 예약일</b>: RESERVATION.RESERVE_DATE(현재값). 비어 있으면 마지막 스텝의 예약일.</li>
 * </ol>
 *
 * <p>HISTORY_TIME 은 varchar 라 형식이 섞여 있다(2026-09 실측: 절반 이상이 표준 형식이 아님). 읽을 수 있으면 그 값을,
 * 못 읽으면 HISTORY_NUM 앞 12자리(yyMMddHHmmss — 채번 시각)를 시각으로 쓴다. 둘 다 없으면 시각을 비운다 —
 * 배치가 죽지 않고 화면이 "시각 미상" 으로 보여 준다. 순서는 SQL 이 준 HISTORY_NUM 순(= 시간순)을 그대로 믿는다.
 */
public final class ReservationChangeChainBuilder {

    /** 이력 1행 — 저장 시각 원문(HISTORY_TIME) · 이력 번호(HISTORY_NUM, 앞 12자리 yyMMddHHmmss) · 그때의 예약일. */
    public record HistoryStep(String historyTime, String historyNum, String reserveDate) {
        /** HISTORY_NUM 없이 만드는 축약 생성자(테스트·단순 호출용). */
        public HistoryStep(String historyTime, String reserveDate) {
            this(historyTime, "", reserveDate);
        }
    }

    /** 예약 1건의 원천(RESERVATION 현재값 + 이력 행들). */
    public record Source(
            String reserveNum,
            String chartNo,
            String name,
            String branch,
            String reserveState,
            String finalDate,
            String insertedAt,
            List<HistoryStep> history
    ) {
    }

    private record Step(String changedAt, String reserveDate) {
    }

    private static final Pattern DATE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");
    private static final Pattern RESERVE_NUM_DATE = Pattern.compile("^[0-9]{6}");
    private static final Pattern HISTORY_NUM_TIME = Pattern.compile("^[0-9]{12}");
    private static final DateTimeFormatter HISTORY_NUM_FMT = DateTimeFormatter.ofPattern("yyMMddHHmmss");
    private static final DateTimeFormatter OUT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final List<DateTimeFormatter> IN = List.of(
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss"),
            DateTimeFormatter.ofPattern("yyyyMMddHHmm"),
            // MSSQL CONVERT(varchar, datetime) 기본(style 100) — "09  4 2026  1:58PM". 의사랑 연동(imedic)이 이 형식으로 쓴다.
            // 일·시 자리는 공백 패딩(ppd·pph). 2026-09 실측 한 주치 451건 중 277행.
            DateTimeFormatter.ofPattern("MM ppd yyyy pph:mma", Locale.ENGLISH)
    );

    private ReservationChangeChainBuilder() {
    }

    public static Optional<ReservationChangeRow> build(Source source) {
        List<Step> steps = collapse(source.history());
        if (steps.isEmpty()) {
            return Optional.empty();
        }

        String[] registration = registration(source);
        if (registration == null) {
            return Optional.empty();
        }

        String finalDate = isDate(source.finalDate()) ? source.finalDate() : steps.get(steps.size() - 1).reserveDate();
        StringBuilder chain = new StringBuilder();
        for (Step step : steps) {
            if (chain.length() > 0) chain.append('|');
            chain.append(step.changedAt()).append('@').append(step.reserveDate());
        }
        return Optional.of(new ReservationChangeRow(
                trim(source.reserveNum()),
                registration[0],
                registration[1],
                registration[2],
                trim(source.chartNo()),
                trim(source.name()),
                trim(source.branch()),
                trim(source.reserveState()),
                steps.get(0).reserveDate(),
                finalDate,
                steps.size() - 1,
                chain.toString(),
                steps.get(steps.size() - 1).changedAt()
        ));
    }

    /** 이력 1행의 시각 — HISTORY_TIME 을 못 읽으면 HISTORY_NUM 채번 시각으로 대체. */
    public static Optional<LocalDateTime> stepTime(HistoryStep h) {
        return parseTime(h.historyTime()).or(() -> parseHistoryNum(h.historyNum()));
    }

    /** HISTORY_NUM 앞 12자리 yyMMddHHmmss. 형식이 다르면 empty. */
    public static Optional<LocalDateTime> parseHistoryNum(String num) {
        if (num == null) return Optional.empty();
        String s = num.trim();
        if (!HISTORY_NUM_TIME.matcher(s).find()) return Optional.empty();
        try {
            return Optional.of(LocalDateTime.parse(s.substring(0, 12), HISTORY_NUM_FMT));
        } catch (DateTimeParseException e) {
            return Optional.empty();
        }
    }

    /** 이력 원문(HISTORY_TIME)에서 시각을 읽는다. 형식을 모르면 empty. */
    public static Optional<LocalDateTime> parseTime(String raw) {
        if (raw == null) return Optional.empty();
        String s = raw.trim();
        if (s.isEmpty()) return Optional.empty();
        // 밀리초 자리가 3자리보다 길면(datetime2 원문) 3자리로 자른다.
        int dot = s.indexOf('.');
        if (dot > 0 && s.length() - dot - 1 > 3) {
            s = s.substring(0, dot + 4);
        }
        for (DateTimeFormatter f : IN) {
            try {
                return Optional.of(LocalDateTime.parse(s, f));
            } catch (DateTimeParseException ignored) {
                // 다음 형식 시도
            }
        }
        return Optional.empty();
    }

    private static List<Step> collapse(List<HistoryStep> history) {
        List<Step> steps = new ArrayList<>();
        if (history == null) return steps;
        for (HistoryStep h : history) {
            String date = trim(h.reserveDate());
            if (!isDate(date)) continue;
            if (!steps.isEmpty() && steps.get(steps.size() - 1).reserveDate().equals(date)) continue;
            String at = stepTime(h).map(t -> t.format(OUT)).orElse("");
            steps.add(new Step(at, date));
        }
        return steps;
    }

    /** {등록일, 등록시각, 출처}. 셋 다 못 정하면 null(예약번호도 날짜꼴이 아님). */
    private static String[] registration(Source source) {
        if (source.history() != null) {
            for (HistoryStep h : source.history()) {
                Optional<LocalDateTime> t = stepTime(h);
                if (t.isPresent()) {
                    String at = t.get().format(OUT);
                    return new String[]{at.substring(0, 10), at.substring(11), "H"};
                }
            }
        }
        Optional<LocalDateTime> inserted = parseTime(source.insertedAt());
        if (inserted.isPresent()) {
            String at = inserted.get().format(OUT);
            return new String[]{at.substring(0, 10), at.substring(11), "I"};
        }
        String num = trim(source.reserveNum());
        if (RESERVE_NUM_DATE.matcher(num).find()) {
            String date = "20" + num.substring(0, 2) + "-" + num.substring(2, 4) + "-" + num.substring(4, 6);
            if (isDate(date)) {
                return new String[]{date, "", "N"};
            }
        }
        return null;
    }

    private static boolean isDate(String s) {
        return s != null && DATE.matcher(s).matches();
    }

    private static String trim(String s) {
        return s == null ? "" : s.trim();
    }
}
