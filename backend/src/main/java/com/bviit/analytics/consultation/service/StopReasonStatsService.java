package com.bviit.analytics.consultation.service;

import com.bviit.analytics.consultation.dto.StopReasonMonthlyItem;
import com.bviit.analytics.consultation.repository.StopReasonStatsRepository;
import com.bviit.analytics.common.util.MonthlyBuckets;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

/**
 * 검사 중단 사유 서비스.
 *
 * EXAM.STOP_YN='Y' 건을 EXAM_MEMO 키워드로 분류한 월별 사유별 건수를 제공한다.
 * 전 기간 운영 DB 라이브 집계(mssql 프로파일에서만). H2(개발)에서는 0으로 채운다.
 * 사유 코드가 DB에 없어 키워드 추정이므로 직원 수동분류와 다를 수 있다(부정확성 감안).
 */
@Service
@RequiredArgsConstructor
public class StopReasonStatsService implements StopReasonStatsReader {

    /** mssql·postgres-mart 프로파일에서만 주입됨. 없으면(H2 개발) 사유별 0으로 반환. */
    private final Optional<StopReasonStatsRepository> repository;

    @Override
    public List<StopReasonMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();

        int minYear = normalizedYears.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = normalizedYears.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String from = minYear + "-01-01";
        String to = maxYear + "-12-31";

        Map<String, Map<String, Object>> dbByKey = repository
                .map(repo -> rowsByMonth(repo.findStopReasonMonthly(from, to)))
                .orElseGet(Map::of);

        List<StopReasonMonthlyItem> items = new ArrayList<>();
        for (Integer year : normalizedYears) {
            for (int month = 1; month <= 12; month++) {
                Map<String, Object> row = dbByKey.get(MonthlyBuckets.key(year, month));
                int recommendX = row == null ? 0 : toInt(row.get("recommendX"));
                int lensImpossible = row == null ? 0 : toInt(row.get("lensImpossible"));
                int keratoconus = row == null ? 0 : toInt(row.get("keratoconus"));
                int avellino = row == null ? 0 : toInt(row.get("avellino"));
                int glaucoma = row == null ? 0 : toInt(row.get("glaucoma"));
                int visionChange = row == null ? 0 : toInt(row.get("visionChange"));
                int other = row == null ? 0 : toInt(row.get("other"));
                int total = recommendX + lensImpossible + keratoconus + avellino + glaucoma + visionChange + other;

                items.add(StopReasonMonthlyItem.builder()
                        .year(year)
                        .month(month)
                        .recommendX(recommendX)
                        .lensImpossible(lensImpossible)
                        .keratoconus(keratoconus)
                        .avellino(avellino)
                        .glaucoma(glaucoma)
                        .visionChange(visionChange)
                        .other(other)
                        .total(total)
                        .build());
            }
        }

        return items;
    }

    private Map<String, Map<String, Object>> rowsByMonth(List<Map<String, Object>> rows) {
        Map<String, Map<String, Object>> byKey = new HashMap<>();
        for (Map<String, Object> row : rows) {
            byKey.put(MonthlyBuckets.key(toInt(row.get("yr")), toInt(row.get("mo"))), row);
        }
        return byKey;
    }
}
