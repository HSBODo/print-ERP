package com.bviit.analytics.surgery.service;

import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;

import java.time.LocalDate;
import java.util.List;

/**
 * 수술별 비중 일별 조회 리더.
 *
 * 구현체는 프로파일에 따라 갈린다:
 *   - {@link SurgeryCompositionQueryService}      : @Profile("mssql")           — MSSQL 직결 (레거시/dev)
 *   - {@link SurgeryCompositionMartQueryService}  : @Profile("postgres-mart") @Primary — mart_surgery_daily 조회
 *
 * WeeklyReportReader / ExamCountReader 와 동일한 두-트랙 규약.
 */
public interface SurgeryCompositionReader {

    DailyResult getDaily(LocalDate from, LocalDate to, String username);

    record DailyResult(List<SurgeryDailyItem> data, StatsResponseMeta meta) {}
}
