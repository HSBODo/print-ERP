package com.bviit.analytics.reservation.service;

import com.bviit.analytics.common.util.MonthlyBuckets;
import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import com.bviit.analytics.reservation.repository.CataractStatsSystemMartRepository;
import com.bviit.analytics.reservation.repository.HomepageOverallSource;
import com.bviit.analytics.reservation.repository.ReservationOverallMartRepository;
import com.bviit.analytics.reservation.repository.ReservationStatsSystemMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.bviit.analytics.reservation.service.OverallOnlineFormula.CUTOVER;
import static com.bviit.analytics.reservation.service.OverallOnlineFormula.computeOnline;
import static com.bviit.analytics.reservation.service.OverallOnlineFormula.countsByMonth;
import static com.bviit.analytics.reservation.service.OverallOnlineFormula.coverageMonth;

/**
 * 예약 종합(콜, 온라인) 월별 통계 — Postgres 마트 조회.
 *
 * postgres-mart 프로파일에서 @Primary. 컨트롤러가 ReservationOverallStatsReader 를 주입하면
 * MSSQL 버전(ReservationOverallStatsService)보다 이 구현체가 우선 선택된다.
 *
 * <h2>컷오버(2026-06) 기준 원천 분기</h2>
 * <pre>
 *   2024·2025    : mart_reservation_overall_monthly 그대로 (V12 seed 확정값)
 *   2026-01 ~ 05 : mart_reservation_overall_monthly 그대로 (V24 seed 골든값 — 담당자 확정)
 *   2026-06 ~    : 요청 시점 실시간 합산 — 온라인/콜 모두 시력교정·백내장 마트에서 SUM
 *                  (reservation_stats_override 오버레이 반영 → 셀 편집 즉시 반영)
 * </pre>
 *
 * <p>컷오버 이후 실시간 합산 원천:
 * <ul>
 *   <li>온라인 = 네이버 + 카카오톡(시력교정 마트) + 홈페이지(홈페이지 마트, 리스트 화면과 동일한 raw)</li>
 *   <li>콜 = [시력교정] call_reservation(인콜) + tm_reservation(TM) + tm_recounsel_reservation(재상담)
 *          + [백내장] new_patient(★신환) + tm_reservation(아웃바운드 예약수)</li>
 *   <li>종합 = 온라인 + 콜 (하나라도 null 이면 null)</li>
 * </ul>
 *
 * <p>홈페이지 스냅샷 커버리지 밖(마지막 등록일 이후 달)은 online = null → 종합도 null.
 * 배치가 채우는 mart_reservation_overall_monthly.online/call 은 컷오버 이후엔 사용하지 않는다.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class ReservationOverallMartQueryService implements ReservationOverallStatsReader {

    private final ReservationOverallMartRepository martRepository;
    private final ReservationStatsSystemMartRepository systemMartRepository;
    private final CataractStatsSystemMartRepository cataractMartRepository;
    private final HomepageOverallSource homepageRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ReservationOverallMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();
        if (normalizedYears.isEmpty()) return List.of();
        YearMonth from = YearMonth.of(normalizedYears.get(0), 1);
        YearMonth to   = YearMonth.of(normalizedYears.get(normalizedYears.size() - 1), 12);
        return getMonthlyStatsInRange(from, to);
    }

    /**
     * 월 범위 [fromMonth, toMonth] 만 계산해 반환한다 — 필요한 월만 훑어 daily 배치 낭비를 줄인다.
     *
     * <p>배치({@link com.bviit.analytics.batch.job.ReservationMartJob}) 는 D-1 하루만 다시 돌리는데
     * 이 서비스가 연도 전체 12개월을 돌면 11/12 계산이 버려진다. 라이브 합산 SQL 도 to 를 tight 하게
     * 잡아 스캔 범위가 줄어든다.
     *
     * <p>계약은 {@link #getMonthlyStats(List)} 와 동일 — 범위 안 월마다 1개 아이템, 미래/pre-cutover
     * 규칙 그대로.
     */
    @Transactional(readOnly = true)
    public List<ReservationOverallMonthlyItem> getMonthlyStatsInRange(YearMonth fromMonth, YearMonth toMonth) {
        if (fromMonth == null || toMonth == null || fromMonth.isAfter(toMonth)) return List.of();

        List<Integer> yearsInRange = new ArrayList<>();
        for (int y = fromMonth.getYear(); y <= toMonth.getYear(); y++) yearsInRange.add(y);

        Map<String, ReservationOverallMonthlyItem> martByYm = new HashMap<>();
        for (ReservationOverallMonthlyItem m : martRepository.findMonthly(yearsInRange)) {
            martByYm.put(MonthlyBuckets.key(m.getYear(), m.getMonth()), m);
        }

        // 컷오버 이후 월이 하나라도 범위에 있어야 라이브 합산 쿼리를 돌린다.
        YearMonth liveFrom = fromMonth.isBefore(CUTOVER) ? CUTOVER : fromMonth;
        YearMonth liveTo   = toMonth;
        boolean needsLiveSum = !liveFrom.isAfter(liveTo);

        Map<String, Integer> naver = Map.of();
        Map<String, Integer> kakao = Map.of();
        Map<String, Integer> homepage = Map.of();
        Map<String, Integer> callReservation = Map.of();
        Map<String, Integer> tmReservation = Map.of();
        Map<String, Integer> tmRecounselReservation = Map.of();
        Map<String, Integer> cataractNewPatient = Map.of();
        Map<String, Integer> cataractTmReservation = Map.of();
        YearMonth homepageMaxMonth = null;

        if (needsLiveSum) {
            String from = liveFrom.atDay(1).toString();
            String to   = liveTo.atEndOfMonth().toString();

            List<Map<String, Object>> sums = systemMartRepository.findMonthlyChannelReservationSums(from, to);
            naver = countsByMonth(sums, "naver_cnt");
            kakao = countsByMonth(sums, "kakao_cnt");
            callReservation = countsByMonth(sums, "call_reservation_cnt");
            tmReservation = countsByMonth(sums, "tm_reservation_cnt");
            tmRecounselReservation = countsByMonth(sums, "tm_recounsel_reservation_cnt");
            List<Map<String, Object>> cataractSums = cataractMartRepository.findMonthlyCallSums(from, to);
            cataractNewPatient = countsByMonth(cataractSums, "new_patient_cnt");
            cataractTmReservation = countsByMonth(cataractSums, "tm_reservation_cnt");
            homepage = countsByMonth(homepageRepository.findMonthlyListRawCounts(from, to), "cnt");
            homepageMaxMonth = coverageMonth(homepageRepository.findLastRegDate());
        }

        YearMonth currentMonth = YearMonth.now();
        List<ReservationOverallMonthlyItem> result = new ArrayList<>();
        for (YearMonth ym = fromMonth; !ym.isAfter(toMonth); ym = ym.plusMonths(1)) {
            int year = ym.getYear();
            int month = ym.getMonthValue();
            String key = MonthlyBuckets.key(year, month);

            if (ym.isAfter(currentMonth)) {
                result.add(emptyItem(year, month));
                continue;
            }

            if (ym.isBefore(CUTOVER)) {
                ReservationOverallMonthlyItem mart = martByYm.get(key);
                result.add(mart != null ? mart : emptyItem(year, month));
                continue;
            }

            // 컷오버 이후: 온라인·콜 모두 라이브 합산
            // 콜 = 시력교정(인콜+TM+TM재상담) + 백내장(★신환+아웃바운드 예약수)
            int liveCall = callReservation.getOrDefault(key, 0)
                    + tmReservation.getOrDefault(key, 0)
                    + tmRecounselReservation.getOrDefault(key, 0)
                    + cataractNewPatient.getOrDefault(key, 0)
                    + cataractTmReservation.getOrDefault(key, 0);
            Integer online = computeOnline(key, ym, naver, kakao, homepage, homepageMaxMonth);
            Integer total = online == null ? null : online + liveCall;

            result.add(ReservationOverallMonthlyItem.builder()
                    .year(year).month(month)
                    .reservations(total)
                    .online(online)
                    .call(liveCall)
                    .total(total)
                    .build());
        }
        return result;
    }

    private static ReservationOverallMonthlyItem emptyItem(int year, int month) {
        return ReservationOverallMonthlyItem.builder()
                .year(year).month(month)
                .reservations(null).online(null).call(null).total(null)
                .build();
    }
}
