package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import com.bviit.analytics.consultation.dto.CataractReservationRateItem;
import com.bviit.analytics.consultation.dto.ConsultationRateItem;
import com.bviit.analytics.consultation.dto.StopReasonMonthlyItem;
import com.bviit.analytics.consultation.repository.ConsultationRateBridgeRepository;
import com.bviit.analytics.consultation.repository.ConsultationRateBridgeRepository.OReservationSummary;
import com.bviit.analytics.consultation.repository.ConsultationRateBridgeRepository.OpSummary;
import com.bviit.analytics.consultation.repository.ConsultationStatsMartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 전환·성공률 도메인 마트 적재 잡 — 하이브리드 설계.
 *
 * 세 개의 마트를 채운다:
 *   - mart_consultation_rate_monthly    — 하이브리드 (Postgres 후보 + MSSQL 미래 예약·수술)
 *   - mart_stop_reason_monthly          — Postgres 리스트 재집계
 *   - mart_reservation_rate_monthly     — 하이브리드 (vision·cataract 각각)
 *
 * ⚠️ 왜 하이브리드인가.
 *   예약률·상담성공률은 "검사자 × 이후 예약/수술" 조인이라 검사일 이후 미래 예약까지 봐야 한다.
 *   list_reservation_all·list_surgery 는 배치 target range 로 잘려 담겨 range 밖(특히 미래) 데이터를
 *   못 봐서 최근월에서 원본 대비 부족(2026-07 vision -125 등)했다.
 *   해결: 검사자 목록은 Postgres primary 리스트에서 뽑고, 그 chart_no 들의 O 예약·수술 요약만
 *   MSSQL 을 실시간 조회해 가져와 Java 에서 결합.
 *
 * 흐름:
 *   1) Postgres 후보 SQL 4개 실행 → 검사자 세션/그룹 후보군
 *   2) 4개에서 뽑은 chart_no 합집합 → MSSQL 브릿지 2개 (O 예약 요약, 수술 요약)
 *   3) Java 에서 후보 × 브릿지 요약 조인해 rate 계산
 *   4) mart upsert
 *   5) 중단 사유는 별도 리스트 재집계 (미래 데이터 불필요)
 *
 * MSSQL 직결 서비스(ConsultationRateService·CataractReservationRateService)는 배치에서 안 쓰지만
 * ConsultationReconcileService 의 대사 소스로 유지된다.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ConsultationMartJob {

    static final String MART_NAME = "consultation";

    private final ConsultationStatsMartRepository martRepository;
    private final ConsultationRateBridgeRepository bridgeRepository;
    private final ConsultationMartWriter writer;
    private final BatchSuccessLogRepository successLogRepository;

    /**
     * 24·25 seed 보호용 min-year 가드.
     * - reservation-rate: V13 시드 보호
     * - consultation-rate: V18 시드(일반예약률) 보호
     * stop-reason 은 24·25 시드가 없으므로 min-year 이하도 write 허용.
     */
    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("ConsultationMartJob start: range={}..{}", from, to);

        // ─── 1) Postgres 후보군 ───────────────────────────────────
        //   ⚠️ from..to 를 그대로 넘기면 안 된다. 이 잡은 하루짜리 범위로도 불린다(매일 03시 D-1 배치).
        //      그때 candidate = D-1 세션만 → 그 달 (yr,mo) 집계에 D-1 하루만 반영되고, upsert 가 EXCLUDED
        //      값으로 통으로 덮어써 그 달 rate 가 하루치로 리셋된다. 게다가 rate 는 분모/분자 모두 D-1 표본이라
        //      비율 자체가 무의미해진다. 수술 도메인이 2026-08-06 유사 사고를 겪었다(SurgeryMartJob 참조).
        //      월별은 언제나 "그 달 전체의 합" 이어야 하므로 candidate 조회를 달 경계로 넓힌다.
        //      list_exam·list_cataract_exam(→ v_all_exam_list) 은 EXAM 배치가 D-1 범위 delete+insert 로
        //      누적해와서 그 달 전체 행이 살아있다. 결과는 filterRate/filterConsult 의 isMonthInRange 로
        //      원래 from..to 안 월만 upsert 된다(D-1 배치면 그 달 1개, monthly reconcile 이면 전월 1개).
        LocalDate monthFrom = from.withDayOfMonth(1);
        LocalDate monthTo = to.withDayOfMonth(to.lengthOfMonth());
        List<Map<String, Object>> visionResRateRows      = martRepository.findReservationRateVisionCandidates(monthFrom.toString(), monthTo.toString());
        List<Map<String, Object>> cataractResRateRows    = martRepository.findReservationRateCataractCandidates(monthFrom.toString(), monthTo.toString());
        List<Map<String, Object>> visionConsultRateRows  = martRepository.findConsultationRateVisionCandidates(monthFrom.toString(), monthTo.toString());
        List<Map<String, Object>> cataractConsultRateRows = martRepository.findConsultationRateCataractCandidates(monthFrom.toString(), monthTo.toString());

        // ─── 2) chart_no 합집합 → MSSQL 브릿지 ───────────────────
        Set<String> chartNos = new HashSet<>();
        collectChartNo(chartNos, visionResRateRows,      "chartNo");
        collectChartNo(chartNos, cataractResRateRows,    "chartNo");
        collectChartNo(chartNos, visionConsultRateRows,  "chartNo");
        collectChartNo(chartNos, cataractConsultRateRows,"chartNo");
        log.info("ConsultationMartJob: {} distinct chart_nos, calling MSSQL bridge", chartNos.size());
        Map<String, OReservationSummary> oResMap = bridgeRepository.findOReservationSummary(chartNos);
        Map<String, OpSummary>           opMap   = bridgeRepository.findOpSummary(chartNos);

        // ─── 3) 예약률 계산 ─────────────────────────────────────
        List<CataractReservationRateItem> visionRates   = computeVisionReservationRate(visionResRateRows, oResMap, opMap);
        List<CataractReservationRateItem> cataractRates = computeCataractReservationRate(cataractResRateRows, oResMap);

        // 골든시드·min-year·range 필터 적용
        visionRates = filterRate(visionRates, from, to);
        cataractRates = filterRate(cataractRates, from, to);

        int visionRows   = writer.upsertReservationRateMonthly("vision",   visionRates);
        int cataractRows = writer.upsertReservationRateMonthly("cataract", cataractRates);

        // ─── 4) 상담성공률 계산 (vision + cataract merged) ──────
        List<ConsultationRateItem> consultationRates = computeConsultationRate(
                visionConsultRateRows, cataractConsultRateRows, oResMap, opMap);
        consultationRates = filterConsult(consultationRates, from, to);
        int consultationRows = writer.upsertConsultationRateMonthly(consultationRates);

        // ─── 5) 중단 사유 (리스트 재집계, 미래 데이터 불필요) ───
        List<StopReasonMonthlyItem> stopReasonMonthly = computeStopReason(from, to);
        int stopReasonRows = writer.upsertStopReasonMonthly(stopReasonMonthly);

        // ─── 6) 성공 로그 ────────────────────────────────────────
        successLogRepository.upsert(MART_NAME, to);

        Map<String, Integer> stats = Map.of(
                "mart_consultation_rate_monthly",         consultationRows,
                "mart_stop_reason_monthly",                stopReasonRows,
                "mart_reservation_rate_monthly[vision]",   visionRows,
                "mart_reservation_rate_monthly[cataract]", cataractRows
        );
        log.info("ConsultationMartJob done: {}", stats);
        return stats;
    }

    // ─── 예약률: vision ────────────────────────────────────────
    /**
     * 시력교정 예약률.
     *   순수 외래 제외 필터 = hasMReservation=1 OR (max O예약일 >= examDate) OR (max 수술일 >= examDate)
     *   examCount = 필터 통과한 세션 수
     *   surgeryBookedCount = 필터 통과 + 어떤 O 예약이든 있는 세션 수 (state<>'C')
     */
    private static List<CataractReservationRateItem> computeVisionReservationRate(
            List<Map<String, Object>> rows,
            Map<String, OReservationSummary> oResMap,
            Map<String, OpSummary> opMap) {
        Map<YearMonth, int[]> agg = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            LocalDate examDate = toLocalDate(row.get("examDate"));
            String chartNo     = str(row.get("chartNo"));
            int hasMReservation = intOf(row, "hasMReservation");
            OReservationSummary o = oResMap.get(chartNo);
            OpSummary op = opMap.get(chartNo);

            boolean passes = hasMReservation == 1
                    || (o != null && o.hasOOnOrAfter(examDate))
                    || (op != null && op.hasOpOnOrAfter(examDate));
            if (!passes) continue;

            YearMonth ym = YearMonth.from(examDate);
            int[] a = agg.computeIfAbsent(ym, k -> new int[2]);
            a[0]++; // examCount
            if (o != null && o.hasAnyO()) a[1]++; // surgeryBookedCount
        }
        return agg.entrySet().stream().map(e -> {
            int examCount = e.getValue()[0];
            int booked    = e.getValue()[1];
            double rate = examCount > 0 ? Math.round(booked * 1000.0 / examCount) / 10.0 : 0.0;
            return CataractReservationRateItem.builder()
                    .year(e.getKey().getYear()).month(e.getKey().getMonthValue())
                    .examCount(examCount).surgeryBookedCount(booked)
                    .reservationRate(rate).build();
        }).toList();
    }

    // ─── 예약률: cataract ──────────────────────────────────────
    /**
     * 백내장 예약률.
     *   examCount = (chart_no × 월) 유니크 수 (Postgres SQL 에서 이미 GROUP BY)
     *   surgeryBookedCount = 그중 백내장 O 예약(JINRYO=4)의 max 예약일이 firstExamDate 이후인 사람 수
     */
    private static List<CataractReservationRateItem> computeCataractReservationRate(
            List<Map<String, Object>> rows,
            Map<String, OReservationSummary> oResMap) {
        Map<YearMonth, int[]> agg = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            String chartNo    = str(row.get("chartNo"));
            int yr            = intOf(row, "yr");
            int mo            = intOf(row, "mo");
            LocalDate first   = toLocalDate(row.get("firstExamDate"));
            OReservationSummary o = oResMap.get(chartNo);

            YearMonth ym = YearMonth.of(yr, mo);
            int[] a = agg.computeIfAbsent(ym, k -> new int[2]);
            a[0]++; // examCount
            if (o != null && o.hasOCataractOnOrAfter(first)) a[1]++;
        }
        return agg.entrySet().stream().map(e -> {
            int examCount = e.getValue()[0];
            int booked    = e.getValue()[1];
            double rate = examCount > 0 ? Math.round(booked * 1000.0 / examCount) / 10.0 : 0.0;
            return CataractReservationRateItem.builder()
                    .year(e.getKey().getYear()).month(e.getKey().getMonthValue())
                    .examCount(examCount).surgeryBookedCount(booked)
                    .reservationRate(rate).build();
        }).toList();
    }

    // ─── 상담성공률: vision(세션) + cataract(고객×월) 병합 ────
    /**
     * 상담성공률 vision+cataract 통합. rate 계산은 원본 ConsultationRateService 와 동일 공식.
     * vision 은 세션 단위, cataract 은 (고객×월) 단위 카운팅.
     */
    private static List<ConsultationRateItem> computeConsultationRate(
            List<Map<String, Object>> visionRows,
            List<Map<String, Object>> cataractRows,
            Map<String, OReservationSummary> oResMap,
            Map<String, OpSummary> opMap) {
        Map<YearMonth, ConsultAgg> agg = new LinkedHashMap<>();

        // vision 세션 폴딩
        for (Map<String, Object> row : visionRows) {
            LocalDate examDate = toLocalDate(row.get("examDate"));
            String chartNo     = str(row.get("chartNo"));
            int counsel = intOf(row, "counsel");
            int od      = intOf(row, "od");
            OReservationSummary o = oResMap.get(chartNo);
            OpSummary op = opMap.get(chartNo);
            int booked = (o != null && o.hasAnyO()) ? 1 : 0;
            int actual = (op != null && op.hasAnyOp()) ? 1 : 0;

            ConsultAgg a = agg.computeIfAbsent(YearMonth.from(examDate), k -> new ConsultAgg());
            a.visionExamCount++;
            if (counsel == 1)                     a.visionCounselCount++;
            if (booked == 1)                      a.visionSurgeryBooked++;
            if (actual == 1)                      a.visionActualSurgery++;
            if (od == 0)                          a.visionExamGeneral++;
            if (od == 0 && booked == 1)           a.visionBookedGeneral++;
            if (od == 1 && counsel == 1)          a.visionCounselOneday++;
            if (od == 1 && counsel == 1 && booked == 1) a.visionCounselBookedOneday++;
            if (od == 0 && counsel == 1)          a.visionCounselGeneral++;
            if (od == 0 && counsel == 1 && booked == 1) a.visionCounselBookedGeneral++;
        }

        // cataract (chart_no × 월) 대입 (원본 SQL 에서 이미 GROUP BY)
        for (Map<String, Object> row : cataractRows) {
            String chartNo = str(row.get("chartNo"));
            int yr = intOf(row, "yr");
            int mo = intOf(row, "mo");
            int stopped = intOf(row, "stopped");
            OReservationSummary o = oResMap.get(chartNo);
            int booked = (o != null && o.hasAnyOCataract()) ? 1 : 0;

            ConsultAgg a = agg.computeIfAbsent(YearMonth.of(yr, mo), k -> new ConsultAgg());
            a.cataractExamCount++;
            if (booked == 1)  a.cataractSurgeryBooked++;
            if (stopped == 1) a.cataractStoppedCount++;
        }

        return agg.entrySet().stream()
                .map(e -> toConsultationRateItem(e.getKey(), e.getValue()))
                .toList();
    }

    private static ConsultationRateItem toConsultationRateItem(YearMonth ym, ConsultAgg a) {
        double visionSurgeryRate     = a.visionExamCount    > 0 ? round1(a.visionSurgeryBooked * 100.0 / a.visionExamCount)    : 0.0;
        double visionCounselRate     = a.visionCounselCount > 0 ? round1(a.visionSurgeryBooked * 100.0 / a.visionCounselCount) : 0.0;
        double visionCounselRateOd   = a.visionCounselOneday  > 0 ? round1(a.visionCounselBookedOneday  * 100.0 / a.visionCounselOneday)  : 0.0;
        double visionCounselRateGen  = a.visionCounselGeneral > 0 ? round1(a.visionCounselBookedGeneral * 100.0 / a.visionCounselGeneral) : 0.0;
        double visionGeneralBookRate = a.visionExamGeneral   > 0 ? round1(a.visionBookedGeneral        * 100.0 / a.visionExamGeneral)    : 0.0;
        double cataractSurgeryRate   = a.cataractExamCount > 0 ? round1(a.cataractSurgeryBooked * 100.0 / a.cataractExamCount) : 0.0;
        return ConsultationRateItem.builder()
                .year(ym.getYear()).month(ym.getMonthValue())
                .visionExamCount(a.visionExamCount)
                .visionCounselCount(a.visionCounselCount)
                .visionSurgeryBooked(a.visionSurgeryBooked)
                .visionActualSurgery(a.visionActualSurgery)
                .visionSurgeryRate(visionSurgeryRate)
                .visionCounselRate(visionCounselRate)
                .visionCounselRateOneday(visionCounselRateOd)
                .visionCounselRateGeneral(visionCounselRateGen)
                .visionGeneralBookRate(visionGeneralBookRate)
                .cataractExamCount(a.cataractExamCount)
                .cataractSurgeryBooked(a.cataractSurgeryBooked)
                .cataractStoppedCount(a.cataractStoppedCount)
                .cataractSurgeryRate(cataractSurgeryRate)
                .build();
    }

    // ─── 중단 사유 (리스트 재집계) ────────────────────────────
    private List<StopReasonMonthlyItem> computeStopReason(LocalDate from, LocalDate to) {
        // ⚠️ from..to 를 그대로 접으면 안 된다 — rate 마트들과 동일 이유. 데일리 D-1 배치면 그 달 중단수가
        //    하루치로 리셋된다. 범위를 달 경계로 넓혀 v_all_exam_list 를 다시 읽고, 아래 isMonthInRange
        //    필터가 원래 from..to 안 월만 upsert 하도록 한다(D-1 배치면 그 달 1개).
        LocalDate monthFrom = from.withDayOfMonth(1);
        LocalDate monthTo = to.withDayOfMonth(to.lengthOfMonth());
        Map<YearMonth, StopReasonAgg> byMonth = new LinkedHashMap<>();
        for (Map<String, Object> row : martRepository.findStopReasonDailyAgg(monthFrom.toString(), monthTo.toString())) {
            LocalDate day = ((java.sql.Date) row.get("d")).toLocalDate();
            StopReasonAgg acc = byMonth.computeIfAbsent(YearMonth.from(day), k -> new StopReasonAgg());
            acc.recommendX     += intOf(row, "recommendX");
            acc.lensImpossible += intOf(row, "lensImpossible");
            acc.keratoconus    += intOf(row, "keratoconus");
            acc.avellino       += intOf(row, "avellino");
            acc.glaucoma       += intOf(row, "glaucoma");
            acc.visionChange   += intOf(row, "visionChange");
            acc.other          += intOf(row, "other");
        }
        return byMonth.entrySet().stream()
                .filter(e -> isMonthInRange(e.getKey().getYear(), e.getKey().getMonthValue(), from, to))
                .map(e -> {
                    StopReasonAgg a = e.getValue();
                    int total = a.recommendX + a.lensImpossible + a.keratoconus + a.avellino
                              + a.glaucoma + a.visionChange + a.other;
                    return StopReasonMonthlyItem.builder()
                            .year(e.getKey().getYear()).month(e.getKey().getMonthValue())
                            .recommendX(a.recommendX).lensImpossible(a.lensImpossible)
                            .keratoconus(a.keratoconus).avellino(a.avellino)
                            .glaucoma(a.glaucoma).visionChange(a.visionChange)
                            .other(a.other).total(total)
                            .build();
                })
                .toList();
    }

    // ─── 골든시드·range 필터 ──────────────────────────────────
    private List<CataractReservationRateItem> filterRate(List<CataractReservationRateItem> items, LocalDate from, LocalDate to) {
        return items.stream()
                .filter(m -> m.getYear() >= minYear)
                .filter(m -> !is2026H1Seeded(m.getYear(), m.getMonth()))
                .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                .toList();
    }

    private List<ConsultationRateItem> filterConsult(List<ConsultationRateItem> items, LocalDate from, LocalDate to) {
        return items.stream()
                .filter(m -> m.getYear() >= minYear)
                .filter(m -> !is2026H1Seeded(m.getYear(), m.getMonth()))
                .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                .toList();
    }

    // ─── 유틸 ─────────────────────────────────────────────────
    private static void collectChartNo(Set<String> sink, List<Map<String, Object>> rows, String key) {
        for (Map<String, Object> row : rows) {
            Object v = row.get(key);
            if (v != null) {
                String s = v.toString().trim();
                if (!s.isEmpty()) sink.add(s);
            }
        }
    }

    private static int intOf(Map<String, Object> row, String key) {
        Object v = row.get(key);
        return v instanceof Number n ? n.intValue() : 0;
    }

    private static String str(Object v) { return v == null ? "" : v.toString().trim(); }

    private static LocalDate toLocalDate(Object v) {
        if (v == null) return null;
        if (v instanceof java.sql.Date d) return d.toLocalDate();
        if (v instanceof java.time.LocalDate d) return d;
        try {
            return LocalDate.parse(v.toString().substring(0, Math.min(10, v.toString().length())));
        } catch (Exception e) {
            return null;
        }
    }

    private static double round1(double v) { return Math.round(v * 10.0) / 10.0; }

    private static boolean isMonthInRange(int year, int month, LocalDate from, LocalDate to) {
        YearMonth ym = YearMonth.of(year, month);
        return !ym.isBefore(YearMonth.from(from)) && !ym.isAfter(YearMonth.from(to));
    }

    /** 2026-01~05 골든 시드 구간. */
    private static boolean is2026H1Seeded(int year, int month) {
        return year == 2026 && month >= 1 && month <= 5;
    }

    private static final class ConsultAgg {
        int visionExamCount, visionCounselCount, visionSurgeryBooked, visionActualSurgery;
        int visionExamGeneral, visionBookedGeneral;
        int visionCounselOneday, visionCounselBookedOneday;
        int visionCounselGeneral, visionCounselBookedGeneral;
        int cataractExamCount, cataractSurgeryBooked, cataractStoppedCount;
    }

    private static final class StopReasonAgg {
        int recommendX, lensImpossible, keratoconus, avellino, glaucoma, visionChange, other;
    }
}
