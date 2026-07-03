package com.bviit.analytics.overall.service;

import com.bviit.analytics.overall.dto.OverallExamWeeklyItem;
import com.bviit.analytics.overall.repository.OverallExamWeeklyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

/**
 * 검사자 종합표 주간 집계 서비스.
 *
 * 일자별 운영 DB 집계를 주(월~일, 월 경계 클립)로 버킷팅한다.
 *   - 1일~첫 월요일 직전의 선행 부분 구간은 첫 정규 주에 합쳐 1주로 만든다(1주 = 1일~첫 일요일).
 *     이후 7일(월~일)씩 묶고, 마지막 주만 부분 주(*)가 될 수 있다.
 *   - 월 경계를 걸친 주는 각 달로 잘라 귀속 → 월 합계 = 그 달 주 합계
 *   - 데이터가 있는 주만 행으로 내보낸다(라이브 집계, 빈 미래 주 제외)
 *
 * 전 구간 운영 DB 라이브다(2024~2025 레거시 고정값은 월 단위라 주로 분해 불가하여 미사용).
 * EXAM/Cataract_Exam 스냅샷 특성상 과거 주 수치는 사후 미세 변동할 수 있어 캐시하지 않는다.
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class OverallExamWeeklyService implements OverallExamWeeklyReader {

    private final OverallExamWeeklyRepository repository;

    @Override
    @Transactional(readOnly = true)
    public List<OverallExamWeeklyItem> getWeeklyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();
        int minYear = normalizedYears.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = normalizedYears.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String from = minYear + "-01-01";
        String to = maxYear + "-12-31";

        Map<String, Acc> buckets = new LinkedHashMap<>();

        accumulate(buckets, repository.findDemographicsDaily(from, to), (acc, row) -> {
            acc.totalExam += toInt(row.get("popTotal"));
            acc.cataractTotal += toInt(row.get("cataractSessions"));
            acc.jobOffice += toInt(row.get("jobOffice"));
            acc.jobStudent += toInt(row.get("jobStudent"));
            acc.jobEtc += toInt(row.get("jobEtc"));
            acc.introCustomer += toInt(row.get("introCustomer"));
            acc.introStaff += toInt(row.get("introStaff"));
            acc.introGeneral += toInt(row.get("introGeneral"));
        });
        accumulate(buckets, repository.findVisionDaily(from, to), (acc, row) -> {
            acc.visionExam += toInt(row.get("examCount"));
            acc.visionBooked += toInt(row.get("surgeryBooked"));
        });
        accumulate(buckets, repository.findCataractDaily(from, to), (acc, row) -> {
            acc.cataractOnly += toInt(row.get("examCount"));
            acc.cataractBooked += toInt(row.get("surgeryBooked"));
        });
        accumulate(buckets, repository.findDreamlensDaily(from, to), (acc, row) ->
                acc.dreamlens += toInt(row.get("cnt")));
        accumulate(buckets, repository.findStopCountDaily(from, to), (acc, row) ->
                acc.stopCount += toInt(row.get("cnt")));
        accumulate(buckets, repository.findOneDayDaily(from, to), (acc, row) -> {
            acc.oneDay += toInt(row.get("oneDay"));
            acc.oneDayBooked += toInt(row.get("oneDayBooked"));
        });

        List<OverallExamWeeklyItem> result = new ArrayList<>(buckets.size());
        buckets.values().stream()
                .sorted((a, b) -> a.key.compareTo(b.key))
                .forEach(acc -> result.add(acc.toItem()));
        return result;
    }

    private void accumulate(Map<String, Acc> buckets, List<Map<String, Object>> rows,
                            BiConsumer<Acc, Map<String, Object>> apply) {
        for (Map<String, Object> row : rows) {
            String d = String.valueOf(row.get("d"));
            if (d == null || d.length() < 10) {
                continue;
            }
            Week w = Week.of(d);
            Acc acc = buckets.computeIfAbsent(w.key, k -> new Acc(w));
            apply.accept(acc, row);
        }
    }

    /** 주(월~일, 월 경계 클립) 식별자 + 표시용 기간. */
    private record Week(String key, int year, int month, int week,
                        String startDate, String endDate, boolean partial) {

        static Week of(String isoDate) {
            LocalDate date = LocalDate.parse(isoDate.substring(0, 10));
            int year = date.getYear();
            int month = date.getMonthValue();
            int day = date.getDayOfMonth();

            // 그 달 1일의 요일 (월=0 ... 일=6) 과 첫 월요일 날짜
            int dow1 = date.withDayOfMonth(1).getDayOfWeek().getValue() - 1;
            int firstMonday = 1 + ((7 - dow1) % 7);

            // 1일~첫 월요일 직전의 선행 부분 구간은 첫 정규 주(월~일)에 합쳐 1주로 만든다.
            // 즉 1주 = [1일 ~ 첫 일요일], 이후 7일(월~일)씩, 마지막 주만 부분 주가 될 수 있다.
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
    private static final class Acc {
        private final String key;
        private final Week week;
        private int totalExam, introGeneral, introCustomer, introStaff;
        private int jobOffice, jobStudent, jobEtc;
        private int visionBooked, cataractTotal, cataractOnly, cataractBooked;
        private int stopCount, visionExam, dreamlens, oneDay, oneDayBooked;

        private Acc(Week week) {
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
}
