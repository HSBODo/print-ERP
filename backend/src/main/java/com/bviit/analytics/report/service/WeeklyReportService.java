package com.bviit.analytics.report.service;

import com.bviit.analytics.consultation.repository.ConsultationRateBridgeRepository;
import com.bviit.analytics.consultation.repository.ConsultationRateBridgeRepository.OReservationSummary;
import com.bviit.analytics.exam.repository.ExamStatsMartRepository;
import com.bviit.analytics.outpatient.repository.OutpatientCountStatsMartRepository;
import com.bviit.analytics.report.dto.WeeklyReportItem;
import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.repository.CataractStatsSystemMartRepository;
import com.bviit.analytics.reservation.repository.HomepageOverallSource;
import com.bviit.analytics.reservation.repository.ReservationStatsSystemMartRepository;
import com.bviit.analytics.surgery.repository.SurgeryStatsMartRepository;
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
import java.util.HashSet;
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
 * 그래서 여기서는 전 구간을 일별 집계로 계산한다 — 같은 달이라도 월간 레포트와 미세하게
 * 다를 수 있다(주간 검사자 종합지표와 같은 성격).
 *
 * <h2>소스</h2>
 * primary list(마트) 를 접어 만든다 — 월간 레포트·리스트 화면과 같은 정의 하나만 봄.
 * <ul>
 *   <li>검사 유입·총·시력교정·원데이·백내장·중단수 : {@code v_all_exam_list}</li>
 *   <li>수술 3종 : {@code v_all_surgery_list}</li>
 *   <li>외래수 : {@code list_outpatient}</li>
 *   <li>예약률 계열 : {@code v_all_exam_list} 세션 + MSSQL 브릿지(미래 O 예약 실시간 판정)</li>
 *   <li>예약 종합(콜·온라인) : 채널 마트({@code mart_reservation_stats_*_daily}) + 홈페이지 마트</li>
 * </ul>
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
@Profile("postgres-mart")
@RequiredArgsConstructor
@Slf4j
public class WeeklyReportService implements WeeklyReportReader {

    /** 온라인 예약 구성요소 ③ 홈페이지. 미설정 환경에서는 비어 있다(컷오버 이후 구간만 영향). */
    private final Optional<HomepageOverallSource> homepageRepository;
    /** 검사 지표를 전체 검사자 리스트 뷰에서 뽑는다. */
    private final ExamStatsMartRepository examAggRepository;
    private final SurgeryStatsMartRepository surgeryAggRepository;
    /** 외래수를 외래수 리스트에서 뽑는다. */
    private final OutpatientCountStatsMartRepository outpatientAggRepository;
    /** 예약 종합의 채널 원시(시력교정) 를 채널 마트에서 접는다. */
    private final ReservationStatsSystemMartRepository systemDailyRepository;
    /** 예약 종합의 채널 원시(백내장) 를 채널 마트에서 접는다. */
    private final CataractStatsSystemMartRepository cataractDailyRepository;
    /**
     * MSSQL 브릿지 — chart_no 셋의 O 예약·수술 요약을 실시간 조회.
     * 예약률·상담성공률 배치와 같은 방식으로 배치 range 밖(미래) 예약까지 반영한다.
     */
    private final ConsultationRateBridgeRepository bridgeRepository;

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

        Map<String, Acc> buckets = new LinkedHashMap<>();

        /* ── 검사 유입·총검사자·시력교정·원데이·중단수 (검사수 카테고리) — v_all_exam_list 하나에서 ──
         * 월간 레포트·리스트 화면과 같은 정의라 세 화면이 어긋날 수 없다.
         *
         * stop_count 도 여기서 함께 받는다(V52 로 v_all_exam_list.stop_yn 붙임). 원본 raw EXAM 대비
         * list_exam 4개 필터(테스트·pure cataract empty·순수 외래 유입·백내장 중복) 만큼 소폭 적음 —
         * mart_stop_reason_monthly 와 같은 성격의 정상 diff.
         *
         * 백내장 검사수(cataract_exam 컬럼)는 여기서 안 담는다 — 아래 예약률 계열이 세션 리스트를
         * (chart_no × 주) 사람 단위로 접으며 함께 채우기 때문(cataractExam 필드는 예약률 분모와 정합). */
        accumulate(buckets, wanted, examAggRepository.findExamDailyAgg(fromDate, toDate), "d", (acc, row) -> {
            acc.examTotal = plus(acc.examTotal, toInt(row.get("total")));
            acc.introGeneral = plus(acc.introGeneral, toInt(row.get("intro_general")));
            acc.introCustomer = plus(acc.introCustomer, toInt(row.get("intro_customer")));
            acc.introStaff = plus(acc.introStaff, toInt(row.get("intro_staff")));
            acc.jobOffice = plus(acc.jobOffice, toInt(row.get("job_office")));
            acc.jobStudent = plus(acc.jobStudent, toInt(row.get("job_student")));
            acc.jobEtc = plus(acc.jobEtc, toInt(row.get("job_etc")));
            acc.visionExam = plus(acc.visionExam, toInt(row.get("vision")));
            acc.oneDay = plus(acc.oneDay, toInt(row.get("one_day")));
            acc.stopCount = plus(acc.stopCount, toInt(row.get("stop_count")));
        });

        /* ── 예약률 계열 (세션 리스트 + MSSQL 브릿지) ──
         * 시력교정 3개(예약률·일반예약률·원데이 예약률) + 백내장 예약률(사람 단위) 을 함께 계산.
         * booked 판정은 배치 range 밖(미래) O 예약까지 봐야 정확하므로 chart_no 셋을 브릿지에 넘긴다. */
        accumulateRatesFromSessions(buckets, wanted, fromDate, toDate);

        /* ── 외래수 ── 외래수 리스트(list_outpatient) 를 접어 만든다. 외래수 화면·월별 마트와 같은 정의. */
        accumulate(buckets, wanted,
                outpatientAggRepository.findOutpatientDailyAgg(fromDate, toDate), "d", (acc, row) ->
                        acc.outpatient = plus(acc.outpatient, toInt(row.get("total"))));

        /* ── 수술 3종 (수술일 기준) — v_all_surgery_list 일별 집계에서 받는다.
         * 월간 레포트·수술 건수와 같은 행을 ISO 주차로 접는 것뿐이라 월↔주가 어긋날 수 없다.
         *
         * ⚠️ cataractSurgery 는 **안(눈)** 단위다. visionSurgery 는 사람.
         *    이름과 단위가 다르니 합산·비교 시 주의(정의는 v_all_surgery_list 머리주석). */
        accumulate(buckets, wanted,
                surgeryAggRepository.findSurgeryDailyAgg(fromDate, toDate), "dt", (acc, row) -> {
            acc.visionSurgery = plus(acc.visionSurgery, toInt(row.get("vision_patients")));
            acc.cataractSurgery = plus(acc.cataractSurgery, toInt(row.get("cataract_patients")));
            acc.totalSurgery = plus(acc.totalSurgery, toInt(row.get("total")));
            acc.reoperation = plus(acc.reoperation, toInt(row.get("reoperation")));
            acc.reopLaser = plus(acc.reopLaser, toInt(row.get("reop_laser")));
            acc.reopLens = plus(acc.reopLens, toInt(row.get("reop_lens")));
        });

        /* ── 예약 (콜·온라인·종합) ── */
        accumulateReservationsFromMart(buckets, wanted, fromDate, toDate);

        List<WeeklyReportItem> result = new ArrayList<>(buckets.size());
        buckets.values().stream()
                .sorted(Comparator.comparingInt((Acc a) -> a.year).thenComparingInt(a -> a.week))
                .forEach(acc -> result.add(acc.toItem()));
        return result;
    }

    /* ── 예약률 계열 (세션 리스트 + MSSQL 브릿지) ───────────────── */

    /**
     * 마트 경로에서 예약률 계열을 세션 리스트로 접어 만든다.
     *
     * <p>계산 대상:
     * <ul>
     *   <li>시력교정 예약률       : visionBooked / visionExam</li>
     *   <li>시력교정 일반예약률   : bookedGeneral / examGeneralBase (원데이 제외)</li>
     *   <li>원데이 예약률          : oneDayBooked / oneDay</li>
     *   <li>백내장 예약률(사람)    : cataractBooked / cataractExam  (chart_no × 주 유니크)</li>
     * </ul>
     *
     * <p>booked 판정은 배치 range 밖(미래) O 예약까지 봐야 하므로 chart_no 셋을 MSSQL 브릿지에 넘겨
     * 요약(min/max O·O(4)·수술일)을 받아 Java 에서 결합한다. 원데이 예약률만 예외 —
     * "검사일 이후 O 예약" 이 조건이라 브릿지의 max_o_any >= exam_date 로 판정.
     */
    private void accumulateRatesFromSessions(Map<String, Acc> buckets, Set<Integer> wanted,
                                             String fromDate, String toDate) {
        List<Map<String, Object>> visionRows = examAggRepository.findVisionSessions(fromDate, toDate);
        List<Map<String, Object>> cataractRows = examAggRepository.findCataractSessions(fromDate, toDate);

        Set<String> chartNos = new HashSet<>();
        for (Map<String, Object> row : visionRows) {
            String s = str(row.get("chartNo"));
            if (!s.isEmpty()) chartNos.add(s);
        }
        for (Map<String, Object> row : cataractRows) {
            String s = str(row.get("chartNo"));
            if (!s.isEmpty()) chartNos.add(s);
        }
        Map<String, OReservationSummary> oResMap = bridgeRepository.findOReservationSummary(chartNos);
        // OpSummary 는 이번 지표에서 필요 없음 — 상담성공률 actualSurgery 만 씀. 브릿지 조회 생략.

        /* ── 시력교정 세션 (세션 단위) ── */
        for (Map<String, Object> row : visionRows) {
            LocalDate examDate = toLocalDate(row.get("examDate"));
            if (examDate == null) continue;
            Acc acc = bucketOf(buckets, wanted, examDate.toString());
            if (acc == null) continue;
            String chartNo = str(row.get("chartNo"));
            String examType = str(row.get("examType"));
            OReservationSummary o = oResMap.get(chartNo);
            boolean bookedAny  = o != null && o.hasAnyO();
            boolean bookedFrom = o != null && o.hasOOnOrAfter(examDate);
            boolean isOneday = "원데이".equals(examType);
            boolean isGeneral = "일반".equals(examType);

            if (bookedAny) acc.visionBooked = plus(acc.visionBooked, 1);
            if (isGeneral) {
                acc.examGeneralBase = plus(acc.examGeneralBase, 1);
                if (bookedAny) acc.bookedGeneral = plus(acc.bookedGeneral, 1);
            }
            if (isOneday && bookedFrom) acc.oneDayBooked = plus(acc.oneDayBooked, 1);
        }

        /* ── 백내장 세션 → (chart_no × 주) 사람 단위로 접기 ──
         *   examCount     = 그 주에 검사받은 유니크 사람 수
         *   surgeryBooked = 그중 firstExamDate(주 안 min) 이후 O(백내장) 예약 보유
         *   배치의 monthly cataract 정의(chart_no × 월) 를 주 단위로 옮긴 것과 같은 규칙. */
        Map<String, Map<String, LocalDate>> cataractByWeekPerson = new LinkedHashMap<>();
        for (Map<String, Object> row : cataractRows) {
            LocalDate examDate = toLocalDate(row.get("examDate"));
            if (examDate == null) continue;
            int weekYear = examDate.get(IsoFields.WEEK_BASED_YEAR);
            if (!wanted.contains(weekYear)) continue;
            int week = examDate.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
            String weekKey = weekYear + "-" + week;
            String chartNo = str(row.get("chartNo"));
            if (chartNo.isEmpty()) continue;

            cataractByWeekPerson
                    .computeIfAbsent(weekKey, k -> new HashMap<>())
                    .merge(chartNo, examDate, (a, b) -> a.isBefore(b) ? a : b);
        }
        for (Map<String, LocalDate> personsInWeek : cataractByWeekPerson.values()) {
            for (Map.Entry<String, LocalDate> personEntry : personsInWeek.entrySet()) {
                LocalDate firstExamDate = personEntry.getValue();
                Acc acc = bucketOf(buckets, wanted, firstExamDate.toString());
                if (acc == null) continue;
                acc.cataractExam = plus(acc.cataractExam, 1);
                OReservationSummary o = oResMap.get(personEntry.getKey());
                if (o != null && o.hasOCataractOnOrAfter(firstExamDate)) {
                    acc.cataractBooked = plus(acc.cataractBooked, 1);
                }
            }
        }
    }

    /* ── 예약 종합 ─────────────────────────────────────────────── */

    /**
     * 콜·온라인·종합을 날짜 단위로 계산해 주에 더한다 — 화면 예약 종합(ReservationOverallMartQueryService)
     * 과 완전 동일한 계산식. 온라인 정의가 달 단위로 갈리므로(컷오버) 주가 아니라 날짜로 판정해야
     * 경계 주가 정확해진다.
     *
     * <ul>
     *   <li>콜 = 시력교정(인콜 + TM + TM재상담) + 백내장(★신환 + TM예약)</li>
     *   <li>온라인(2026-06+) = 시력교정(네이버 + 카카오) + 홈페이지</li>
     *   <li>온라인(2026-05 이전) = 정의 자체가 legacy(RESERVE_PATH ONLINE/APP/NAVER). 채널 마트에 그 값이 없으므로 미상 처리.
     *       — 2025 는 어차피 V55 시드로 mart_weekly_report 에 이미 있어 이 계산 결과가 나가지 않는다.</li>
     * </ul>
     */
    private void accumulateReservationsFromMart(Map<String, Acc> buckets, Set<Integer> wanted,
                                                String fromDate, String toDate) {
        Map<String, Integer> callByDay = new HashMap<>();
        Map<String, Integer> onlinePostCutoverByDay = new HashMap<>();

        // 시력교정 채널 마트
        for (ReservationStatsDailyRow r : systemDailyRepository.findDailyCounts(fromDate, toDate)) {
            String d = r.date();
            if (d == null) continue;
            callByDay.merge(d, r.callReservation() + r.tmReservation() + r.tmRecounselReservation(), Integer::sum);
            onlinePostCutoverByDay.merge(d, r.naverReservation() + r.kakaoReservation(), Integer::sum);
        }

        // 백내장 채널 마트 (콜에만 기여)
        for (CataractStatsDailyRow r : cataractDailyRepository.findDailyCounts(fromDate, toDate)) {
            String d = r.date();
            if (d == null) continue;
            callByDay.merge(d, r.newPatient() + r.tmReservation(), Integer::sum);
        }

        // 홈페이지 (컷오버 이후 온라인 구성요소)
        Map<String, Integer> homepageByDay = Map.of();
        LocalDate homepageCeiling = null;
        boolean homepageAvailable = false;
        if (homepageRepository.isPresent()) {
            LocalDate end = LocalDate.parse(toDate);
            LocalDate cutoverStart = CUTOVER.atDay(1);
            LocalDate homepageFrom = cutoverStart.isAfter(LocalDate.parse(fromDate)) ? cutoverStart : LocalDate.parse(fromDate);
            if (!homepageFrom.isAfter(end)) {
                try {
                    homepageByDay = countsByDay(
                            homepageRepository.get().findDailyListRawCounts(homepageFrom.toString(), toDate), "cnt");
                    homepageCeiling = parseDate(homepageRepository.get().findLastRegDate());
                    homepageAvailable = true;
                } catch (RuntimeException e) {
                    log.warn("주차 레포트: 홈페이지 소스 조회 실패 — {} 이후 온라인 예약을 미상으로 둡니다. ({})",
                            CUTOVER, e.toString());
                }
            } else {
                homepageAvailable = true; // 컷오버 이후 구간이 없어 쓸 일 없음
            }
        }

        LocalDate end = LocalDate.parse(toDate);
        LocalDate ceiling = homepageCeiling;
        for (LocalDate day = LocalDate.parse(fromDate); !day.isAfter(end); day = day.plusDays(1)) {
            String key = day.toString();

            Integer call = callByDay.get(key);
            if (call != null) {
                Acc acc = bucketOf(buckets, wanted, key);
                if (acc != null) acc.call = plus(acc.call, call);
            }

            if (YearMonth.from(day).isBefore(CUTOVER)) {
                // 컷오버 이전 온라인은 legacy 정의라 채널 마트에 없다 → 미상.
                // (2025 는 V55 시드가 채우고 배치는 write 하지 않음.)
                Acc acc = existingBucket(buckets, wanted, key);
                if (acc != null) acc.onlineUnknown = true;
                continue;
            }

            if (!homepageAvailable || beyondCoverage(day, ceiling)) {
                Acc acc = existingBucket(buckets, wanted, key);
                if (acc != null) acc.onlineUnknown = true;
                continue;
            }

            int post = onlinePostCutoverByDay.getOrDefault(key, 0) + homepageByDay.getOrDefault(key, 0);
            boolean hasSource = onlinePostCutoverByDay.containsKey(key) || homepageByDay.containsKey(key);
            Acc acc = hasSource ? bucketOf(buckets, wanted, key) : existingBucket(buckets, wanted, key);
            if (acc != null) acc.online = plus(acc.online, post);
        }
    }

    /**
     * 홈페이지 소스 커버리지를 넘긴 날인가.
     * 이번 주(진행 중) + 지난 주(방금 끝난 주) 는 관대하게 본다.
     * 소스가 하루이틀 늦게 채워지는 경우가 잦아, 지난 주 마지막 하루만 부족해도
     * 한 주 전체 online 이 NULL 이 되면 실측 6일치가 화면에서 통째로 사라진다
     * (2026-09-22 W38 사례). 있는 값(6일 합) 이라도 확정으로 표시하고, 소스가
     * 뒤늦게 채워지면 다음 배치가 upsert 로 정확한 값으로 갱신한다.
     */
    private static boolean beyondCoverage(LocalDate day, LocalDate ceiling) {
        if (ceiling == null || !day.isAfter(ceiling)) {
            return false;
        }
        LocalDate today = LocalDate.now();
        if (isSameIsoWeek(day, today)) return false;
        if (isSameIsoWeek(day, today.minusWeeks(1))) return false;
        return true;
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

    private static String str(Object v) { return v == null ? "" : v.toString().trim(); }

    private static LocalDate toLocalDate(Object v) {
        if (v == null) return null;
        if (v instanceof java.sql.Date d) return d.toLocalDate();
        if (v instanceof LocalDate d) return d;
        String s = v.toString();
        return s.length() < 10 ? null : LocalDate.parse(s.substring(0, 10));
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
        private Integer visionBooked, cataractBooked, oneDayBooked, stopCount;
        private Integer examGeneralBase, bookedGeneral;
        private Integer visionSurgery, cataractSurgery, totalSurgery;
        private Integer reoperation, reopLaser, reopLens;
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
                    .cataractBooked(cataractBooked)
                    .oneDayBooked(oneDayBooked).stopCount(stopCount)
                    .examGeneralBase(examGeneralBase).bookedGeneral(bookedGeneral)
                    .visionSurgery(visionSurgery).cataractSurgery(cataractSurgery).totalSurgery(totalSurgery)
                    .reoperation(reoperation).reopLaser(reopLaser).reopLens(reopLens)
                    .outpatient(outpatient)
                    .build();
        }
    }
}
