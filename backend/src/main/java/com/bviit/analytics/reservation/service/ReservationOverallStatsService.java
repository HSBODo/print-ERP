package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import com.bviit.analytics.reservation.repository.HomepageOverallSource;
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
import static com.bviit.analytics.reservation.service.OverallOnlineFormula.CUTOVER;
import static com.bviit.analytics.reservation.service.OverallOnlineFormula.computeOnline;
import static com.bviit.analytics.reservation.service.OverallOnlineFormula.countsByMonth;
import static com.bviit.analytics.reservation.service.OverallOnlineFormula.coverageMonth;


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
 *   2024·2025    : 온라인 = RESERVE_PATH ONLINE/APP(홈페이지) + NAVER(네이버). V12 시드 확정값.
 *   2026-01 ~ 05 : V24 골든 시드(담당자 확정값) — 배치 write 는 ReservationMartJob 에서 필터로 차단.
 *   2026-06 ~    : 온라인 = 네이버(RSS 기준) + 카카오톡(해피톡) + 홈페이지(레거시, 리스트 화면과 동일한 raw)
 * </pre>
 * 종합 = 콜 + 온라인 이므로 종합도 2026-06 부터 같이 움직인다.
 *
 * <p><b>왜 자바에서 합치나</b> — 네이버·카카오는 MSSQL, 홈페이지는 레거시 홈페이지(별도 DB)라
 * SQL 한 방으로 조인할 수 없다. 그래서 세 쿼리를 각각 읽어 여기서 더한다.
 *
 * <p><b>레거시 소스가 없으면 실패시킨다</b> — 홈페이지 몫이 빠진 채로 조용히 작은 값을 마트에
 * 적재하면 아무도 눈치채지 못한다. 운영에도 {@code homepage.datasource.url} 이 설정돼 있어야 한다.
 *
 * ⚠️ 등록일(InsertedDateTime) 기준 집계. 미래월은 자연히 행이 없어 null.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationOverallStatsService implements ReservationOverallStatsReader {

    private final ReservationOverallStatsRepository repository;
    /**
     * 홈페이지 몫 소스. postgres-mart 에서는 {@code ReservationListHomepageMartRepository}
     * ({@code @Primary}) 가 마트 테이블 {@code mart_list_reservation_homepage} 를 읽고,
     * 그 외 프로파일에서는 레거시 소스판({@code ReservationListHomepageRepository}) 이
     * {@code homepage.datasource.url} 이 설정된 경우에만 후보로 들어온다.
     *
     * <p><b>배치 순서 결합</b> — postgres-mart 에서 마트를 읽으므로,
     * {@code ReservationListHomepageMartJob} 이 이 서비스를 호출하는 {@code ReservationMartJob}
     * 보다 먼저 실행돼야 한다({@code BatchOrchestrator.runDomains} 참조).
     *
     * <p>미설정 환경(마트도 없고 레거시 URL 도 없음)에서는 비어 있다 — 컷오버(2026-06) 이후 달을
     * 계산할 때만 필수라 그 이전 구간(2024·2025, 2026-01~05 V24 시드)은 이 값 없이도 정상 동작한다.
     */
    private final Optional<HomepageOverallSource> homepageRepository;

    @Override
    public List<ReservationOverallMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();

        int minYear = normalizedYears.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = normalizedYears.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String from = minYear + "-01-01";
        // MSSQL 소스(종합·네이버·카카오)는 InsertedDateTime <= :to 라 상한에 시각이 필요하다.
        String to = maxYear + "-12-31 23:59:59";
        // 레거시 홈페이지 소스는 규약이 다르다 — reg_date < (:to + 1일) 반개구간이라 '날짜'를 기대한다.
        // 위 to 를 그대로 넘기면 MariaDB 에서 < (다음해 1/1 23:59:59) 가 되어 다음 해 1/1 이 딸려오고,
        // SQLite 는 date() 가 시각을 버려 딸려오지 않는다 — 같은 입력에 소스별로 결과가 갈린다.
        String homepageTo = maxYear + "-12-31";

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
                .anyMatch(y -> !YearMonth.of(y, 12).isBefore(CUTOVER));

        // 컷오버 이후 구간에서만 쓰는 재료들. 필요 없으면 쿼리도 날리지 않는다.
        Map<String, Integer> naver = needsNewFormula ? countsByMonth(repository.findNaverMonthly(from, to), "naver_cnt") : Map.of();
        Map<String, Integer> kakao = needsNewFormula ? countsByMonth(repository.findKakaoMonthly(from, to), "kakao_cnt") : Map.of();
        Map<String, Integer> homepage = Map.of();
        YearMonth homepageMaxMonth = null;

        if (needsNewFormula) {
            HomepageOverallSource homepageRepo = homepageRepository.orElseThrow(() ->
                    new IllegalStateException(
                            "온라인 예약(2026-06~)은 홈페이지 소스가 필요합니다. "
                            + "postgres-mart 에서는 mart_list_reservation_homepage 마트가 채워져 있어야 하고, "
                            + "그 외 프로파일에서는 homepage.datasource.url 을 설정하세요. "
                            + "(미설정 상태로 계산하면 홈페이지 몫이 빠진 값이 조용히 적재됩니다)"));

            homepage = countsByMonth(homepageRepo.findMonthlyListRawCounts(from, homepageTo), "cnt");
            homepageMaxMonth = coverageMonth(homepageRepo.findLastRegDate());
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
                } else if (ym.isBefore(CUTOVER)) {
                    online = dbOnline.get(key);
                    total = dbTotal.get(key);
                } else {
                    online = computeOnline(key, ym, naver, kakao, homepage, homepageMaxMonth);
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
}
