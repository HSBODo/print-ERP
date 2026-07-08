package com.bviit.analytics.consultation.service;

import com.bviit.analytics.consultation.dto.ConsultationRateItem;
import com.bviit.analytics.consultation.repository.ConsultationRateRepository;
import com.bviit.analytics.common.util.MonthlyBuckets;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.bviit.analytics.common.util.NumberUtils.roundToOneDecimal;
import static com.bviit.analytics.common.util.NumberUtils.toInt;

@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class ConsultationRateService implements ConsultationRateReader {

    private final ConsultationRateRepository repository;

    @Override
    @Transactional(readOnly = true)
    public List<ConsultationRateItem> getMonthlyRates(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String fromDate = minYear + "-01-01";
        String toDate = maxYear + "-12-31";

        List<Map<String, Object>> visionRows = repository.findMonthlyVisionRates(fromDate, toDate);
        List<Map<String, Object>> cataractRows = repository.findMonthlyCataractRates(fromDate, toDate);

        Map<String, Builder> result = MonthlyBuckets.initialize(years, Builder::new);

        // 시력교정 병합
        for (Map<String, Object> row : visionRows) {
            int yr = toInt(row.get("yr"));
            int mo = toInt(row.get("mo"));
            Builder b = result.get(MonthlyBuckets.key(yr, mo));
            if (b == null) continue;

            int exam = toInt(row.get("examCount"));
            int counsel = toInt(row.get("counselCount"));
            int booked = toInt(row.get("surgeryBookedCount"));
            int actual = toInt(row.get("actualSurgeryCount"));

            b.visionExamCount = exam;
            b.visionCounselCount = counsel;
            b.visionSurgeryBooked = booked;
            b.visionActualSurgery = actual;
            b.visionSurgeryRate = exam > 0 ? roundToOneDecimal(booked * 100.0 / exam) : 0;
            b.visionCounselRate = counsel > 0 ? roundToOneDecimal(booked * 100.0 / counsel) : 0;

            int counselOd = toInt(row.get("counselOneday"));
            int counselBookedOd = toInt(row.get("counselBookedOneday"));
            int counselGen = toInt(row.get("counselGeneral"));
            int counselBookedGen = toInt(row.get("counselBookedGeneral"));
            int examGen = toInt(row.get("examGeneral"));
            int bookedGen = toInt(row.get("bookedGeneral"));
            b.visionCounselRateOneday = counselOd > 0 ? roundToOneDecimal(counselBookedOd * 100.0 / counselOd) : 0;
            b.visionCounselRateGeneral = counselGen > 0 ? roundToOneDecimal(counselBookedGen * 100.0 / counselGen) : 0;
            b.visionGeneralBookRate = examGen > 0 ? roundToOneDecimal(bookedGen * 100.0 / examGen) : 0;
        }

        // 백내장 병합
        for (Map<String, Object> row : cataractRows) {
            int yr = toInt(row.get("yr"));
            int mo = toInt(row.get("mo"));
            Builder b = result.get(MonthlyBuckets.key(yr, mo));
            if (b == null) continue;

            int exam = toInt(row.get("examCount"));
            int booked = toInt(row.get("surgeryBookedCount"));
            int stopped = toInt(row.get("stoppedCount"));

            b.cataractExamCount = exam;
            b.cataractSurgeryBooked = booked;
            b.cataractStoppedCount = stopped;
            b.cataractSurgeryRate = exam > 0 ? roundToOneDecimal(booked * 100.0 / exam) : 0;
        }

        List<ConsultationRateItem> items = new ArrayList<>();
        for (Builder b : result.values()) {
            items.add(b.build());
        }
        return items;
    }

    /** 가변 빌더 — 시력교정/백내장 두 소스 병합용 */
    private static class Builder {
        final int year;
        final int month;
        int visionExamCount;
        int visionCounselCount;
        int visionSurgeryBooked;
        int visionActualSurgery;
        double visionSurgeryRate;
        double visionCounselRate;
        double visionCounselRateOneday;
        double visionCounselRateGeneral;
        double visionGeneralBookRate;
        int cataractExamCount;
        int cataractSurgeryBooked;
        int cataractStoppedCount;
        double cataractSurgeryRate;

        Builder(int year, int month) {
            this.year = year;
            this.month = month;
        }

        ConsultationRateItem build() {
            return ConsultationRateItem.builder()
                    .year(year).month(month)
                    .visionExamCount(visionExamCount)
                    .visionCounselCount(visionCounselCount)
                    .visionSurgeryBooked(visionSurgeryBooked)
                    .visionActualSurgery(visionActualSurgery)
                    .visionSurgeryRate(visionSurgeryRate)
                    .visionCounselRate(visionCounselRate)
                    .visionCounselRateOneday(visionCounselRateOneday)
                    .visionCounselRateGeneral(visionCounselRateGeneral)
                    .visionGeneralBookRate(visionGeneralBookRate)
                    .cataractExamCount(cataractExamCount)
                    .cataractSurgeryBooked(cataractSurgeryBooked)
                    .cataractStoppedCount(cataractStoppedCount)
                    .cataractSurgeryRate(cataractSurgeryRate)
                    .build();
        }
    }
}
