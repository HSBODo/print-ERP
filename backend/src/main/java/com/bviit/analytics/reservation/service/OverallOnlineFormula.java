package com.bviit.analytics.reservation.service;

import com.bviit.analytics.common.util.MonthlyBuckets;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

/**
 * 예약 종합의 온라인 예약 공식(2026-06 컷오버 이후) 공유 유틸.
 *
 * <p>공식: 온라인 = 네이버 + 카카오톡 + 홈페이지(리스트 화면과 동일한 raw · 전 진료 · COUNT(*)).
 * 이 정의는 예약자 리스트_홈페이지 화면 건수와 정확히 정합하도록 통일한 것이다(2026-07-24).
 *
 * <p>배치 계산 경로({@link ReservationOverallStatsService})와 실시간 조회 경로
 * ({@link ReservationOverallMartQueryService})가 동일 공식을 공유하도록 한 곳에 모아둔다.
 * 실시간 경로는 셀 편집이 즉시 반영되도록 postgres 마트(오버라이드 포함)를 소스로 사용한다.
 */
public final class OverallOnlineFormula {

    /** 온라인 예약 정의가 바뀌는 시점. 이 달부터 네이버+카카오톡+홈페이지 합산. */
    public static final YearMonth CUTOVER = YearMonth.of(2026, 6);

    private OverallOnlineFormula() {}

    /** (yr, mo, countColumn) rows → "yr-mo" → count 맵. */
    public static Map<String, Integer> countsByMonth(List<Map<String, Object>> rows, String countColumn) {
        Map<String, Integer> out = new HashMap<>();
        for (Map<String, Object> row : rows) {
            out.put(MonthlyBuckets.key(toInt(row.get("yr")), toInt(row.get("mo"))), toInt(row.get(countColumn)));
        }
        return out;
    }

    /**
     * 온라인 예약 값. 홈페이지 커버리지 외 구간은 null(선 끊김).
     *
     * <p>홈페이지 소스가 스냅샷이면 마지막 등록일 이후 달은 데이터가 아예 없어 0 으로 보인다.
     * 그 구간을 0 으로 더하면 '조용히 작은 온라인 예약'이 되므로 null 을 준다.
     */
    public static Integer computeOnline(
            String key,
            YearMonth ym,
            Map<String, Integer> naver,
            Map<String, Integer> kakao,
            Map<String, Integer> homepage,
            YearMonth homepageMaxMonth
    ) {
        if (homepageMaxMonth != null && ym.isAfter(homepageMaxMonth)) {
            return null;
        }
        return naver.getOrDefault(key, 0)
                + kakao.getOrDefault(key, 0)
                + homepage.getOrDefault(key, 0);
    }

    /**
     * 홈페이지 소스가 커버하는 마지막 달.
     *
     * <p><b>과거 달은 엄격</b> — 말일까지 담긴 경우에만 그 달을 인정한다. 부분 과거 월을 0 으로 더하면
     * '조용히 작은 온라인 예약'이 되기 때문.
     *
     * <p><b>현재 달은 관대함</b> — 진행 중인 달은 정의상 말일까지 안 담겨 있어도
     * 사용자에게 "현재까지 접수된 온라인 예약" 을 보여주는 편이 유용하다.
     *
     * @param lastRegDate 소스의 마지막 등록일시('YYYY-MM-DD ...'). 빈 값이면 판정 불가.
     * @return 판정 불가면 null — 이 경우 달 제한을 걸지 않는다
     */
    public static YearMonth coverageMonth(String lastRegDate) {
        if (lastRegDate == null || lastRegDate.length() < 10) {
            return null;
        }
        LocalDate last = LocalDate.parse(lastRegDate.substring(0, 10));
        YearMonth ym = YearMonth.from(last);
        if (ym.equals(YearMonth.now())) {
            return ym;
        }
        return last.getDayOfMonth() == ym.lengthOfMonth() ? ym : ym.minusMonths(1);
    }
}
