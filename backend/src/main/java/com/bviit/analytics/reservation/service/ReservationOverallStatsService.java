package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import com.bviit.analytics.reservation.repository.ReservationListHomepageRepository;
import com.bviit.analytics.reservation.repository.ReservationOverallStatsRepository;
import com.bviit.analytics.common.util.MonthlyBuckets;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

/**
 * 예약 종합(콜, 온라인) / 온라인 예약 — MSSQL 직결 소스.
 *
 * 배치({@code ReservationOverallMartJob})가 MSSQL 원천을 읽어 {@code mart_reservation_overall_monthly}
 * 에 upsert 하기 위해 사용한다. 컨트롤러 조회 흐름은 {@code ReservationOverallMartQueryService}
 * (postgres-mart @Primary)가 마트에서 읽기 때문에 여기로 오지 않는다.
 *
 * 24·25 확정값은 V12 seed 로 마트에 저장되어 있고 min-year 가드로 write 차단되므로,
 * 여기서는 별도의 LEGACY_* 하드코딩을 두지 않는다.
 *
 * <h2>온라인 예약 정의가 2026-06 부터 바뀐다</h2>
 * <pre>
 *   ~ 2026-05 : 온라인 = RESERVE_PATH ONLINE/APP(홈페이지) + NAVER(네이버). 카카오 미포함.
 *   2026-06 ~ : 온라인 = 네이버(RSS 기준) + 카카오톡(해피톡) + 홈페이지(레거시, 중복제외·시력교정만)
 * </pre>
 * 종합 = 콜 + 온라인 이므로 종합도 2026-06 부터 같이 움직인다(2026-07-15 결정).
 *
 * <p><b>왜 자바에서 합치나</b> — 네이버·카카오는 MSSQL, 홈페이지는 레거시 홈페이지(별도 DB)라
 * SQL 한 방으로 조인할 수 없다. 그래서 세 쿼리를 각각 읽어 여기서 더한다.
 *
 * <p><b>레거시 소스가 없으면 실패시킨다</b> — 홈페이지 몫이 빠진 채로 조용히 작은 값을 마트에
 * 적재하면 아무도 눈치채지 못한다. 운영에도 {@code legacy.datasource.url} 이 설정돼 있어야 한다.
 *
 * ⚠️ 등록일(InsertedDateTime) 기준 집계. 미래월은 자연히 행이 없어 null.
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class ReservationOverallStatsService implements ReservationOverallStatsReader {

    /** 온라인 예약 정의가 바뀌는 시점. 이 달부터 네이버+카카오톡+홈페이지 합산. */
    static final YearMonth ONLINE_FORMULA_CUTOVER = YearMonth.of(2026, 6);

    private final ReservationOverallStatsRepository repository;
    /** 레거시 홈페이지 소스. 미설정 환경에서는 비어 있다 — 컷오버 이후 달을 계산할 때만 필수. */
    private final Optional<ReservationListHomepageRepository> homepageRepository;

    @Override
    public List<ReservationOverallMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();

        int minYear = normalizedYears.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = normalizedYears.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String from = minYear + "-01-01";
        String to = maxYear + "-12-31 23:59:59";

        List<Map<String, Object>> rows = repository.findReservationOverallMonthly(from, to);
        Map<String, Integer> dbTotal = new HashMap<>();
        Map<String, Integer> dbOnline = new HashMap<>();
        Map<String, Integer> dbCall = new HashMap<>();
        for (Map<String, Object> row : rows) {
            String key = MonthlyBuckets.key(toInt(row.get("yr")), toInt(row.get("mo")));
            dbTotal.put(key, toInt(row.get("cnt")));
            dbOnline.put(key, toInt(row.get("online_cnt")));
            dbCall.put(key, toInt(row.get("call_cnt")));
        }

        YearMonth currentMonth = YearMonth.now();
        boolean needsNewFormula = normalizedYears.stream()
                .anyMatch(y -> !YearMonth.of(y, 12).isBefore(ONLINE_FORMULA_CUTOVER));

        // 컷오버 이후 구간에서만 쓰는 재료들. 필요 없으면 쿼리도 날리지 않는다.
        Map<String, Integer> naver = needsNewFormula ? countsByMonth(repository.findNaverMonthly(from, to), "naver_cnt") : Map.of();
        Map<String, Integer> kakao = needsNewFormula ? countsByMonth(repository.findKakaoMonthly(from, to), "kakao_cnt") : Map.of();
        Map<String, Integer> homepage = Map.of();
        YearMonth homepageMaxMonth = null;

        if (needsNewFormula) {
            ReservationListHomepageRepository homepageRepo = homepageRepository.orElseThrow(() ->
                    new IllegalStateException(
                            "온라인 예약(2026-06~)은 레거시 홈페이지 소스가 필요합니다. "
                            + "legacy.datasource.url 을 설정하세요. "
                            + "(미설정 상태로 계산하면 홈페이지 몫이 빠진 값이 조용히 적재됩니다)"));

            homepage = countsByMonth(homepageRepo.findMonthlyDedupedCounts(from, to), "cnt");
            homepageMaxMonth = snapshotCoverageMonth(homepageRepo.findSnapshotMaxRegDate());
        }

        List<ReservationOverallMonthlyItem> items = new ArrayList<>();
        for (Integer year : normalizedYears) {
            for (int month = 1; month <= 12; month++) {
                YearMonth ym = YearMonth.of(year, month);
                String key = MonthlyBuckets.key(year, month);
                boolean future = ym.isAfter(currentMonth);

                Integer call = future ? null : dbCall.get(key);
                Integer online;
                Integer total;

                if (future) {
                    online = null;
                    total = null;
                } else if (ym.isBefore(ONLINE_FORMULA_CUTOVER)) {
                    online = dbOnline.get(key);
                    total = dbTotal.get(key);
                } else {
                    online = newOnline(key, ym, naver, kakao, homepage, homepageMaxMonth);
                    // 종합 = 콜 + 새 온라인. 둘 중 하나라도 모르면 종합도 모른다.
                    total = (online == null || call == null) ? null : online + call;
                }

                items.add(ReservationOverallMonthlyItem.builder()
                        .year(year)
                        .month(month)
                        .reservations(total)
                        .online(online)
                        .call(call)
                        .total(total)
                        .build());
            }
        }

        return items;
    }

    /**
     * 2026-06~ 온라인 예약 = 네이버 + 카카오톡 + 홈페이지(중복제외).
     *
     * <p>홈페이지 소스가 스냅샷이면 마지막 등록일 이후 달은 데이터가 아예 없어 0 으로 보인다.
     * 그 구간을 0 으로 더하면 '조용히 작은 온라인 예약'이 되므로 null 을 준다(차트에서 선이 끊긴다).
     */
    private Integer newOnline(
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

    private Map<String, Integer> countsByMonth(List<Map<String, Object>> rows, String countColumn) {
        Map<String, Integer> out = new HashMap<>();
        for (Map<String, Object> row : rows) {
            out.put(MonthlyBuckets.key(toInt(row.get("yr")), toInt(row.get("mo"))), toInt(row.get(countColumn)));
        }
        return out;
    }

    /**
     * 홈페이지 소스가 '온전히' 커버하는 마지막 달.
     *
     * <p>스냅샷 마지막 등록일이 2026-07-10 이면 7월은 10일까지만 있으므로 신뢰할 수 없다 →
     * 온전한 마지막 달은 6월이다. 말일까지 담긴 경우에만 그 달을 인정한다.
     *
     * @return 판정 불가(빈 값)면 null — 이 경우 달 제한을 걸지 않는다(실시간 소스로 본다)
     */
    private YearMonth snapshotCoverageMonth(String snapshotMaxRegDate) {
        if (snapshotMaxRegDate == null || snapshotMaxRegDate.length() < 10) {
            return null;
        }
        java.time.LocalDate last = java.time.LocalDate.parse(snapshotMaxRegDate.substring(0, 10));
        YearMonth ym = YearMonth.from(last);
        return last.getDayOfMonth() == ym.lengthOfMonth() ? ym : ym.minusMonths(1);
    }
}
