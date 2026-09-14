package com.bviit.analytics.overall.service;

import com.bviit.analytics.overall.dto.OverallExamMonthlyItem;
import com.bviit.analytics.overall.dto.OverallExamWeeklyItem;
import com.bviit.analytics.overall.repository.OverallExamListDailyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

/**
 * 검사자 종합지표 list 재집계기 (배치 전용).
 *
 * v_all_exam_list(V56 확장) 의 일별 집계 결과를 주(월~일, 월 경계 클립)로 버킷팅하고
 * 월별은 그 주별을 (yr, mo) 로 롤업한다. 계산 결과는 종전 MSSQL 직결
 * {@link OverallExamWeeklyService}·{@link OverallExamMonthlyService} 와 동일 shape.
 *
 * MSSQL 접근이 없다 — 배치 시점 이후 MSSQL 이 꺼져도 재실행 가능.
 * EXAM 도메인({@code ExamMartJob})이 먼저 list_exam·list_cataract_exam 을 채워야 값이 나온다.
 *
 * 주 경계 규칙 (OverallExamWeeklyService.Week 와 동일):
 *   - 1일~첫 월요일 직전의 선행 부분 구간은 첫 정규 주에 합쳐 1주로 만든다(1주 = 1일~첫 일요일).
 *   - 이후 7일(월~일)씩 묶고, 마지막 주만 부분 주(*)가 될 수 있다.
 *   - 월 경계를 걸친 주는 각 달로 잘라 귀속 → 월 합계 = 그 달 주 합계.
 */
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OverallExamListAggregator {

    private final OverallExamListDailyRepository repository;

    /**
     * 주간 통계 계산 — v_all_exam_list 를 일별 집계 후 주 버킷팅.
     */
    @Transactional(readOnly = true)
    public List<OverallExamWeeklyItem> getWeeklyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();
        int minYear = normalizedYears.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = normalizedYears.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String from = minYear + "-01-01";
        String to = maxYear + "-12-31";

        Map<String, WeekAcc> buckets = new LinkedHashMap<>();
        for (Map<String, Object> row : repository.findOverallExamDailyAgg(from, to)) {
            LocalDate day = ((java.sql.Date) row.get("d")).toLocalDate();
            Week w = Week.of(day);
            WeekAcc acc = buckets.computeIfAbsent(w.key, k -> new WeekAcc(w));
            acc.totalExam      += toInt(row.get("popTotal"));
            acc.cataractTotal  += toInt(row.get("cataractSessions"));
            acc.jobOffice      += toInt(row.get("jobOffice"));
            acc.jobStudent     += toInt(row.get("jobStudent"));
            acc.jobEtc         += toInt(row.get("jobEtc"));
            acc.introGeneral   += toInt(row.get("introGeneral"));
            acc.introCustomer  += toInt(row.get("introCustomer"));
            acc.introStaff     += toInt(row.get("introStaff"));
            acc.visionExam     += toInt(row.get("visionExam"));
            acc.visionBooked   += toInt(row.get("visionBooked"));
            acc.cataractOnly   += toInt(row.get("cataractOnly"));
            acc.cataractBooked += toInt(row.get("cataractBooked"));
            acc.dreamlens      += toInt(row.get("dreamlens"));
            acc.stopCount      += toInt(row.get("stopCount"));
            acc.oneDay         += toInt(row.get("oneDay"));
            acc.oneDayBooked   += toInt(row.get("oneDayBooked"));
        }

        List<OverallExamWeeklyItem> result = new ArrayList<>(buckets.size());
        buckets.values().stream()
                .sorted((a, b) -> a.key.compareTo(b.key))
                .forEach(acc -> result.add(acc.toItem()));
        return result;
    }

    /**
     * 월간 통계 계산 — 주간을 (yr, mo) 로 재합산. partial 은 오늘 기준 진행 중인 월에만 true.
     */
    @Transactional(readOnly = true)
    public List<OverallExamMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<OverallExamWeeklyItem> weekly = getWeeklyStats(years);
        Map<String, MonthAcc> buckets = new LinkedHashMap<>();
        for (OverallExamWeeklyItem w : weekly) {
            String key = String.format("%04d-%02d", w.getYear(), w.getMonth());
            MonthAcc acc = buckets.computeIfAbsent(key, k -> new MonthAcc(w.getYear(), w.getMonth()));
            acc.add(w);
        }
        YearMonth current = YearMonth.now();
        List<OverallExamMonthlyItem> result = new ArrayList<>(buckets.size());
        for (MonthAcc acc : buckets.values()) {
            boolean partial = current.equals(YearMonth.of(acc.year, acc.month));
            result.add(acc.toItem(partial));
        }
        return result;
    }

    /** 주(월~일, 월 경계 클립) 식별자 + 표시용 기간. OverallExamWeeklyService.Week 와 동일 규칙. */
    private record Week(String key, int year, int month, int week,
                        String startDate, String endDate, boolean partial) {

        static Week of(LocalDate date) {
            int year = date.getYear();
            int month = date.getMonthValue();
            int day = date.getDayOfMonth();

            int dow1 = date.withDayOfMonth(1).getDayOfWeek().getValue() - 1;
            int firstMonday = 1 + ((7 - dow1) % 7);
            int week = day < firstMonday ? 1 : (day - firstMonday) / 7 + 1;

            int lastDay = YearMonth.of(year, month).lengthOfMonth();
            int startDay = week == 1 ? 1 : firstMonday + (week - 1) * 7;
            int endDayFull = week == 1 ? firstMonday + 6 : startDay + 6;
            int endDay = Math.min(endDayFull, lastDay);
            boolean partial = week != 1 && (endDay - startDay + 1) < 7;

            String key = String.format("%04d-%02d-%d", year, month, week);
            return new Week(key, year, month, week,
                    String.format("%04d-%02d-%02d", year, month, startDay),
                    String.format("%04d-%02d-%02d", year, month, endDay),
                    partial);
        }
    }

    /** 주 단위 누적 버킷. */
    private static final class WeekAcc {
        private final String key;
        private final Week week;
        private int totalExam, introGeneral, introCustomer, introStaff;
        private int jobOffice, jobStudent, jobEtc;
        private int visionBooked, cataractTotal, cataractOnly, cataractBooked;
        private int stopCount, visionExam, dreamlens, oneDay, oneDayBooked;

        private WeekAcc(Week week) {
            this.key = week.key();
            this.week = week;
        }

        private OverallExamWeeklyItem toItem() {
            return OverallExamWeeklyItem.builder()
                    .year(week.year()).month(week.month()).week(week.week())
                    .partial(week.partial()).startDate(week.startDate()).endDate(week.endDate())
                    .totalExam(totalExam)
                    .introGeneral(introGeneral).introCustomer(introCustomer).introStaff(introStaff)
                    .jobOffice(jobOffice).jobStudent(jobStudent).jobEtc(jobEtc)
                    .visionBooked(visionBooked)
                    .cataractTotal(cataractTotal).cataractOnly(cataractOnly).cataractBooked(cataractBooked)
                    .stopCount(stopCount).visionExam(visionExam).dreamlens(dreamlens)
                    .oneDay(oneDay).oneDayBooked(oneDayBooked)
                    .build();
        }
    }

    /** 월 단위 누적 버킷 (주 → 월 롤업). */
    private static final class MonthAcc {
        private final int year;
        private final int month;
        private int totalExam, introGeneral, introCustomer, introStaff;
        private int jobOffice, jobStudent, jobEtc;
        private int visionBooked, cataractTotal, cataractOnly, cataractBooked;
        private int stopCount, visionExam, dreamlens, oneDay, oneDayBooked;

        private MonthAcc(int year, int month) {
            this.year = year;
            this.month = month;
        }

        private void add(OverallExamWeeklyItem w) {
            totalExam += w.getTotalExam();
            introGeneral += w.getIntroGeneral();
            introCustomer += w.getIntroCustomer();
            introStaff += w.getIntroStaff();
            jobOffice += w.getJobOffice();
            jobStudent += w.getJobStudent();
            jobEtc += w.getJobEtc();
            visionBooked += w.getVisionBooked();
            cataractTotal += w.getCataractTotal();
            cataractOnly += w.getCataractOnly();
            cataractBooked += w.getCataractBooked();
            stopCount += w.getStopCount();
            visionExam += w.getVisionExam();
            dreamlens += w.getDreamlens();
            oneDay += w.getOneDay();
            oneDayBooked += w.getOneDayBooked();
        }

        private OverallExamMonthlyItem toItem(boolean partial) {
            return OverallExamMonthlyItem.builder()
                    .year(year).month(month).partial(partial)
                    .totalExam(totalExam)
                    .introGeneral(introGeneral).introCustomer(introCustomer).introStaff(introStaff)
                    .jobOffice(jobOffice).jobStudent(jobStudent).jobEtc(jobEtc)
                    .visionBooked(visionBooked)
                    .cataractTotal(cataractTotal).cataractOnly(cataractOnly).cataractBooked(cataractBooked)
                    .stopCount(stopCount).visionExam(visionExam).dreamlens(dreamlens)
                    .oneDay(oneDay).oneDayBooked(oneDayBooked)
                    .build();
        }
    }
}
