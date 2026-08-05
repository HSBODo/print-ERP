package com.bviit.analytics.report.service;

import com.bviit.analytics.overall.repository.OverallExamWeeklyRepository;
import com.bviit.analytics.report.dto.WeeklyReportItem;
import com.bviit.analytics.report.repository.WeeklyReportRepository;
import com.bviit.analytics.reservation.repository.HomepageOverallSource;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.service.SurgeryStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.IsoFields;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.BiConsumer;

import static com.bviit.analytics.common.util.NumberUtils.toInt;
import static com.bviit.analytics.reservation.service.OverallOnlineFormula.CUTOVER;

/**
 * 주차 레포트 집계 서비스 — 월간 레포트와 같은 도표를 <b>ISO 8601 연간 주차</b>로 계산한다.
 *
 * <h2>주 정의</h2>
 * 월요일~일요일, 첫 목요일이 든 주가 1주차(한 해 52 또는 53주). 예약통계시스템·수술별 비중의
 * '주차' 탭과 같은 번호 체계라 화면 간 "31주차"가 항상 같은 주를 가리킨다.
 * 1주차는 전년 12월을, 마지막 주차는 다음 해 1월을 물 수 있다 — 월 경계로 자르지 않는다
 * (월 경계 클립은 {@code OverallExamWeeklyService} 의 '그 달의 주차'와 다른 개념).
 *
 * <h2>전 구간 라이브</h2>
 * 월간 레포트의 2024·2025 는 레거시 확정값(마트 시드)이라 월 단위로만 존재해 주로 쪼갤 수 없다.
 * 그래서 여기서는 전 구간을 운영 DB 일별 집계로 계산한다 — 같은 달이라도 월간 레포트와 미세하게
 * 다를 수 있다(주간 검사자 종합지표와 같은 성격).
 *
 * <h2>온라인 예약</h2>
 * 정의가 2026-06({@code OverallOnlineFormula.CUTOVER})부터 바뀌므로 <b>날짜 단위</b>로 나눠 더한다
 * — 5월/6월을 걸친 주도 각 날짜의 정의대로 집계된다.
 * <pre>
 *   컷오버 이전 : RESERVE_PATH ONLINE/APP/NAVER
 *   컷오버 이후 : 네이버(RSS) + 카카오톡(해피톡) + 홈페이지(레거시/마트)
 * </pre>
 * 홈페이지 소스가 없거나 커버리지를 넘긴 날이 섞이면 그 주의 온라인·종합을 {@code null} 로 둔다
 * — 홈페이지 몫이 빠진 작은 값을 조용히 내보내지 않기 위해서다.
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
@Slf4j
public class WeeklyReportService implements WeeklyReportReader {

    private final WeeklyReportRepository repository;
    private final OverallExamWeeklyRepository overallRepository;
    private final SurgeryStatsService surgeryStatsService;
    /** 온라인 예약 구성요소 ③ 홈페이지. 미설정 환경에서는 비어 있다(컷오버 이후 구간만 영향). */
    private final Optional<HomepageOverallSource> homepageRepository;

    @Override
    @Transactional(readOnly = true)
    public List<WeeklyReportItem> getWeeklyStats(List<Integer> years) {
        List<Integer> weekYears = years.stream().distinct().sorted().toList();
        if (weekYears.isEmpty()) {
            return List.of();
        }
        Set<Integer> wanted = Set.copyOf(weekYears);

        // ISO 주차연도 경계 — 1주차는 전년 12월에, 마지막 주차는 다음 해 1월에 걸칠 수 있다.
        LocalDate from = isoWeekMonday(weekYears.get(0), 1);
        LocalDate to = isoWeekMonday(weekYears.get(weekYears.size() - 1),
                lastIsoWeek(weekYears.get(weekYears.size() - 1))).plusDays(6);
        String fromDate = from.toString();
        String toDate = to.toString();
        // 등록일시(datetime) 비교용 상한 — 마지막 날의 23:59:59 까지 포함해야 한다.
        String toDateTime = toDate + " 23:59:59";

        Map<String, Acc> buckets = new LinkedHashMap<>();

        /* ── 검사 유입·총검사자 ── */
        accumulate(buckets, wanted, overallRepository.findDemographicsDaily(fromDate, toDate), "d", (acc, row) -> {
            acc.examTotal = plus(acc.examTotal, toInt(row.get("popTotal")));
            acc.introGeneral = plus(acc.introGeneral, toInt(row.get("introGeneral")));
            acc.introCustomer = plus(acc.introCustomer, toInt(row.get("introCustomer")));
            acc.introStaff = plus(acc.introStaff, toInt(row.get("introStaff")));
            acc.jobOffice = plus(acc.jobOffice, toInt(row.get("jobOffice")));
            acc.jobStudent = plus(acc.jobStudent, toInt(row.get("jobStudent")));
            acc.jobEtc = plus(acc.jobEtc, toInt(row.get("jobEtc")));
        });

        /* ── 시력교정 검사 + 예약률 ── */
        accumulate(buckets, wanted, overallRepository.findVisionDaily(fromDate, toDate), "d", (acc, row) -> {
            acc.visionExam = plus(acc.visionExam, toInt(row.get("examCount")));
            acc.visionBooked = plus(acc.visionBooked, toInt(row.get("surgeryBooked")));
        });

        /* ── 백내장 예약률(눈 단위 분모) ── */
        accumulate(buckets, wanted, overallRepository.findCataractDaily(fromDate, toDate), "d", (acc, row) -> {
            acc.cataractExamEyes = plus(acc.cataractExamEyes, toInt(row.get("examCount")));
            acc.cataractBooked = plus(acc.cataractBooked, toInt(row.get("surgeryBooked")));
        });

        /* ── 원데이 + 원데이 예약률 ── */
        accumulate(buckets, wanted, overallRepository.findOneDayDaily(fromDate, toDate), "d", (acc, row) -> {
            acc.oneDay = plus(acc.oneDay, toInt(row.get("oneDay")));
            acc.oneDayBooked = plus(acc.oneDayBooked, toInt(row.get("oneDayBooked")));
        });

        /* ── 중단수 ── */
        accumulate(buckets, wanted, overallRepository.findStopCountDaily(fromDate, toDate), "d", (acc, row) ->
                acc.stopCount = plus(acc.stopCount, toInt(row.get("cnt"))));

        /* ── 백내장 검사수(사람 단위) ── */
        accumulate(buckets, wanted, repository.findCataractExamDaily(fromDate, toDate), "d", (acc, row) ->
                acc.cataractExam = plus(acc.cataractExam, toInt(row.get("cnt"))));

        /* ── 외래수 ── */
        accumulate(buckets, wanted, repository.findOutpatientDaily(fromDate, toDate), "d", (acc, row) ->
                acc.outpatient = plus(acc.outpatient, toInt(row.get("cnt"))));

        /* ── 시력교정 일반예약률 ── */
        accumulate(buckets, wanted, repository.findVisionRatesDaily(fromDate, toDate), "d", (acc, row) -> {
            acc.examGeneralBase = plus(acc.examGeneralBase, toInt(row.get("examGeneral")));
            acc.bookedGeneral = plus(acc.bookedGeneral, toInt(row.get("bookedGeneral")));
        });

        /* ── 수술 3종 (수술일 기준) ── */
        for (SurgeryDailyItem day : surgeryStatsService.getDailyStats(fromDate, toDate)) {
            Acc acc = bucketOf(buckets, wanted, day.getDate());
            if (acc == null) {
                continue;
            }
            acc.visionSurgery = plus(acc.visionSurgery, day.getVisionPatients());
            acc.cataractSurgery = plus(acc.cataractSurgery, day.getCataractPatients());
            acc.totalSurgery = plus(acc.totalSurgery, day.getTotal());
        }

        /* ── 예약 (콜·온라인·종합) ── */
        accumulateReservations(buckets, wanted, fromDate, toDate, toDateTime);

        List<WeeklyReportItem> result = new ArrayList<>(buckets.size());
        buckets.values().stream()
                .sorted(Comparator.comparingInt((Acc a) -> a.year).thenComparingInt(a -> a.week))
                .forEach(acc -> result.add(acc.toItem()));
        return result;
    }

    /* ── 예약 종합 ─────────────────────────────────────────────── */

    /**
     * 콜·온라인·종합을 날짜 단위로 계산해 주에 더한다.
     * 온라인 정의가 달 단위로 갈리므로(컷오버) 주가 아니라 날짜로 판정해야 경계 주가 정확해진다.
     */
    private void accumulateReservations(Map<String, Acc> buckets, Set<Integer> wanted,
                                        String fromDate, String toDate, String toDateTime) {
        Map<String, Integer> callByDay = new HashMap<>();
        Map<String, Integer> onlineLegacyByDay = new HashMap<>();
        for (Map<String, Object> row : repository.findReservationOverallDaily(fromDate, toDateTime)) {
            String d = date(row.get("d"));
            if (d == null) {
                continue;
            }
            callByDay.merge(d, toInt(row.get("call_cnt")), Integer::sum);
            onlineLegacyByDay.merge(d, toInt(row.get("online_cnt")), Integer::sum);
        }

        Map<String, Integer> naverByDay = countsByDay(repository.findReservationNaverDaily(fromDate, toDateTime), "naver_cnt");
        Map<String, Integer> kakaoByDay = countsByDay(repository.findReservationKakaoDaily(fromDate, toDateTime), "kakao_cnt");

        // 홈페이지 몫은 컷오버 이후 구간에서만 쓴다 — 원격 조회 범위도 거기까지만 좁힌다
        // (조회 범위가 전부 컷오버 이전이면 아예 부르지 않는다).
        LocalDate end = LocalDate.parse(toDate);
        LocalDate cutoverStart = CUTOVER.atDay(1);
        boolean needsHomepage = !cutoverStart.isAfter(end);
        String homepageFrom = cutoverStart.isAfter(LocalDate.parse(fromDate)) ? cutoverStart.toString() : fromDate;

        // 홈페이지는 원격(레거시 DB/터널) 소스라 끊길 수 있다. 여기서 죽으면 레포트 전체가 비므로
        // 실패는 '온라인 예약만 미상'으로 격리한다 — 나머지 도표는 그대로 나온다.
        Map<String, Integer> homepageByDay = Map.of();
        LocalDate homepageCeiling = null;
        boolean homepageAvailable = false;
        if (!needsHomepage) {
            homepageAvailable = true; // 쓰이지 않는 구간 — 미상 표시가 붙지 않도록 둔다
        } else if (homepageRepository.isPresent()) {
            HomepageOverallSource source = homepageRepository.get();
            try {
                homepageByDay = countsByDay(source.findDailyListRawCounts(homepageFrom, toDate), "cnt");
                homepageCeiling = parseDate(source.findLastRegDate());
                homepageAvailable = true;
            } catch (RuntimeException e) {
                log.warn("주차 레포트: 홈페이지 소스 조회 실패 — {} 이후 온라인 예약을 미상으로 둡니다. ({})",
                        CUTOVER, e.toString());
            }
        } else {
            log.warn("주차 레포트: 홈페이지 소스가 없어 {} 이후 온라인 예약을 계산할 수 없습니다 "
                    + "(homepage.datasource.url 또는 mart_list_reservation_homepage 필요).", CUTOVER);
        }

        // 콜은 전 구간 동일 정의 — 데이터가 있는 날만 더한다.
        for (Map.Entry<String, Integer> entry : callByDay.entrySet()) {
            Acc acc = bucketOf(buckets, wanted, entry.getKey());
            if (acc != null) {
                acc.call = plus(acc.call, entry.getValue());
            }
        }

        // 온라인은 날짜별 정의로 더한다(컷오버가 달 단위라 주가 아니라 날짜로 갈라야 경계 주가 맞는다).
        // ⚠️ 데이터가 없는 날에 버킷을 만들면 안 된다 — 빈 주가 통째로 생겨 미래 주까지 행이 나온다.
        //    값이 있는 날만 버킷을 만들고(bucketOf), 그 외에는 이미 있는 주에만 손댄다(existingBucket).
        LocalDate ceiling = homepageCeiling;
        for (LocalDate day = LocalDate.parse(fromDate); !day.isAfter(end); day = day.plusDays(1)) {
            String key = day.toString();

            if (YearMonth.from(day).isBefore(CUTOVER)) {
                Integer legacy = onlineLegacyByDay.get(key);
                if (legacy == null) {
                    continue;
                }
                Acc acc = bucketOf(buckets, wanted, key);
                if (acc != null) {
                    acc.online = plus(acc.online, legacy);
                }
                continue;
            }

            if (!homepageAvailable || beyondCoverage(day, ceiling)) {
                Acc acc = existingBucket(buckets, wanted, key);
                if (acc != null) {
                    acc.onlineUnknown = true;
                }
                continue;
            }

            boolean hasSource = naverByDay.containsKey(key)
                    || kakaoByDay.containsKey(key)
                    || homepageByDay.containsKey(key);
            Acc acc = hasSource ? bucketOf(buckets, wanted, key) : existingBucket(buckets, wanted, key);
            if (acc != null) {
                acc.online = plus(acc.online,
                        naverByDay.getOrDefault(key, 0)
                                + kakaoByDay.getOrDefault(key, 0)
                                + homepageByDay.getOrDefault(key, 0));
            }
        }
    }

    /**
     * 홈페이지 소스 커버리지를 넘긴 날인가.
     * 진행 중인 주는 관대하게 본다 — 아직 안 담긴 것이 정상이라 끊으면 오히려 최신 주가 늘 비어 보인다.
     */
    private static boolean beyondCoverage(LocalDate day, LocalDate ceiling) {
        if (ceiling == null || !day.isAfter(ceiling)) {
            return false;
        }
        return !isSameIsoWeek(day, LocalDate.now());
    }

    private static boolean isSameIsoWeek(LocalDate a, LocalDate b) {
        return a.get(IsoFields.WEEK_BASED_YEAR) == b.get(IsoFields.WEEK_BASED_YEAR)
                && a.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR) == b.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
    }

    /* ── 버킷팅 헬퍼 ───────────────────────────────────────────── */

    private void accumulate(Map<String, Acc> buckets, Set<Integer> wanted, List<Map<String, Object>> rows,
                            String dateColumn, BiConsumer<Acc, Map<String, Object>> apply) {
        for (Map<String, Object> row : rows) {
            Acc acc = bucketOf(buckets, wanted, date(row.get(dateColumn)));
            if (acc != null) {
                apply.accept(acc, row);
            }
        }
    }

    /** 날짜 문자열 → 그 날이 속한 ISO 주 버킷(없으면 생성). 조회 대상 주차연도가 아니면 null. */
    private static Acc bucketOf(Map<String, Acc> buckets, Set<Integer> wanted, String isoDate) {
        return bucket(buckets, wanted, isoDate, true);
    }

    /** 이미 만들어진 주 버킷만 돌려준다 — 값이 없는 날에 빈 주를 만들지 않기 위한 조회 전용. */
    private static Acc existingBucket(Map<String, Acc> buckets, Set<Integer> wanted, String isoDate) {
        return bucket(buckets, wanted, isoDate, false);
    }

    private static Acc bucket(Map<String, Acc> buckets, Set<Integer> wanted, String isoDate, boolean create) {
        if (isoDate == null) {
            return null;
        }
        LocalDate date;
        try {
            date = LocalDate.parse(isoDate.substring(0, 10));
        } catch (RuntimeException e) {
            return null;
        }
        int weekYear = date.get(IsoFields.WEEK_BASED_YEAR);
        if (!wanted.contains(weekYear)) {
            return null;
        }
        int week = date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        String key = weekYear + "-" + week;
        return create
                ? buckets.computeIfAbsent(key, k -> new Acc(weekYear, week))
                : buckets.get(key);
    }

    private static Map<String, Integer> countsByDay(List<Map<String, Object>> rows, String column) {
        Map<String, Integer> out = new HashMap<>();
        for (Map<String, Object> row : rows) {
            String d = date(row.get("d"));
            if (d != null) {
                out.merge(d, toInt(row.get(column)), Integer::sum);
            }
        }
        return out;
    }

    /** 날짜 컬럼 값 → 'YYYY-MM-DD'. 형식이 아니면 null. */
    private static String date(Object value) {
        if (value == null) {
            return null;
        }
        String s = String.valueOf(value);
        return s.length() < 10 ? null : s.substring(0, 10);
    }

    private static LocalDate parseDate(String value) {
        if (value == null || value.length() < 10) {
            return null;
        }
        try {
            return LocalDate.parse(value.substring(0, 10));
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static Integer plus(Integer acc, int value) {
        return acc == null ? value : acc + value;
    }

    /** 해당 ISO 주차연도 N주차의 월요일. (1월 4일은 항상 1주차) */
    static LocalDate isoWeekMonday(int weekYear, int week) {
        return LocalDate.of(weekYear, 1, 4)
                .with(IsoFields.WEEK_OF_WEEK_BASED_YEAR, week)
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    /** 해당 ISO 주차연도의 마지막 주차(52 또는 53). 12월 28일은 항상 그 해 마지막 주에 속한다. */
    static int lastIsoWeek(int weekYear) {
        return LocalDate.of(weekYear, 12, 28).get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
    }

    /** 주 단위 누적 버킷 — 값은 '건드리기 전까지 null'(0 과 구분). */
    private static final class Acc {
        private final int year;
        private final int week;

        private Integer call, online;
        private boolean onlineUnknown;
        private Integer introGeneral, introCustomer, introStaff;
        private Integer jobOffice, jobStudent, jobEtc;
        private Integer examTotal, visionExam, cataractExam, oneDay;
        private Integer visionBooked, cataractExamEyes, cataractBooked, oneDayBooked, stopCount;
        private Integer examGeneralBase, bookedGeneral;
        private Integer visionSurgery, cataractSurgery, totalSurgery;
        private Integer outpatient;

        private Acc(int year, int week) {
            this.year = year;
            this.week = week;
        }

        private WeeklyReportItem toItem() {
            LocalDate monday = isoWeekMonday(year, week);
            Integer onlineValue = onlineUnknown ? null : online;
            Integer total = (onlineValue == null || call == null) ? null : onlineValue + call;
            return WeeklyReportItem.builder()
                    .year(year).week(week)
                    .startDate(monday.toString()).endDate(monday.plusDays(6).toString())
                    .reservations(total).call(call).online(onlineValue)
                    .introGeneral(introGeneral).introCustomer(introCustomer).introStaff(introStaff)
                    .jobOffice(jobOffice).jobStudent(jobStudent).jobEtc(jobEtc)
                    .examTotal(examTotal).visionExam(visionExam).cataractExam(cataractExam).oneDay(oneDay)
                    .visionBooked(visionBooked)
                    .cataractExamEyes(cataractExamEyes).cataractBooked(cataractBooked)
                    .oneDayBooked(oneDayBooked).stopCount(stopCount)
                    .examGeneralBase(examGeneralBase).bookedGeneral(bookedGeneral)
                    .visionSurgery(visionSurgery).cataractSurgery(cataractSurgery).totalSurgery(totalSurgery)
                    .outpatient(outpatient)
                    .build();
        }
    }
}
