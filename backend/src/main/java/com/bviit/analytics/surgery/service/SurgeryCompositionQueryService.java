package com.bviit.analytics.surgery.service;

import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/**
 * 수술별 비중 일별 — MSSQL 소스 직결.
 *
 * mssql 프로파일 전용(운영·dev-with-mart 는 {@link SurgeryCompositionMartQueryService} 가 @Primary).
 * postgres-mart 미사용 환경에서만 활성화되며, 요청 시점에 소스 라이브 값을 그대로 돌려준다
 * (파일 스냅샷·read-through fill 규약은 폐지 — 마트가 그 역할을 흡수).
 */
@Service
@Profile("mssql")
@RequiredArgsConstructor
public class SurgeryCompositionQueryService implements SurgeryCompositionReader {

    private static final String FORMULA_VERSION = "surgery-composition-daily-v1";
    private static final int SCHEMA_VERSION = 1;

    private final SurgeryStatsService statsService;

    @Override
    @Transactional(readOnly = true)
    public DailyResult getDaily(LocalDate from, LocalDate to, String username) {
        List<SurgeryDailyItem> data = statsService.getDailyStats(from.toString(), to.toString());
        String period = YearMonth.from(from).toString();
        StatsResponseMeta meta = StatsResponseMeta.live(period, FORMULA_VERSION, SCHEMA_VERSION);
        return new DailyResult(data, meta);
    }
}
