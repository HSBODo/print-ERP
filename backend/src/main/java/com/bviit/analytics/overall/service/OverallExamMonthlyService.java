package com.bviit.analytics.overall.service;

import com.bviit.analytics.overall.dto.OverallExamMonthlyItem;
import com.bviit.analytics.overall.dto.OverallExamWeeklyItem;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 검사자 종합표 월간 집계 서비스 — MSSQL 라이브 롤업.
 *
 * OverallExamWeeklyService 가 이미 일자별을 주(월~일, 월 경계 클립)로 버킷팅했으므로
 * 여기서는 주별을 (yr, mo)로 재합산만 한다. 월 합계 = 그 달 주 합계 (주 데이터가 월 경계에서 잘려 있음).
 *
 * partial 은 오늘 기준 진행 중인 월에 대해서만 true. 지난 월은 false(완결).
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class OverallExamMonthlyService implements OverallExamMonthlyReader {

    private final OverallExamWeeklyService overallExamWeeklyService;

    @Override
    @Transactional(readOnly = true)
    public List<OverallExamMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<OverallExamWeeklyItem> weekly = overallExamWeeklyService.getWeeklyStats(years);
        Map<String, Acc> buckets = new LinkedHashMap<>();

        for (OverallExamWeeklyItem w : weekly) {
            String key = String.format("%04d-%02d", w.getYear(), w.getMonth());
            Acc acc = buckets.computeIfAbsent(key, k -> new Acc(w.getYear(), w.getMonth()));
            acc.add(w);
        }

        YearMonth current = YearMonth.now();
        List<OverallExamMonthlyItem> result = new ArrayList<>(buckets.size());
        for (Acc acc : buckets.values()) {
            boolean partial = current.equals(YearMonth.of(acc.year, acc.month));
            result.add(acc.toItem(partial));
        }
        return result;
    }

    private static final class Acc {
        private final int year;
        private final int month;
        private int totalExam, introGeneral, introCustomer, introStaff;
        private int jobOffice, jobStudent, jobEtc;
        private int visionBooked, cataractTotal, cataractOnly, cataractBooked;
        private int stopCount, visionExam, dreamlens, oneDay, oneDayBooked;

        private Acc(int year, int month) {
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
