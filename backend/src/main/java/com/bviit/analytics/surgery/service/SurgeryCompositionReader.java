package com.bviit.analytics.surgery.service;

import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;

import java.time.LocalDate;
import java.util.List;

/**
 * 수술별 비중 일별 조회 리더.
 *
 * 구현: {@link SurgeryCompositionMartQueryService} — mart_surgery_daily 조회.
 */
public interface SurgeryCompositionReader {

    DailyResult getDaily(LocalDate from, LocalDate to, String username);

    record DailyResult(List<SurgeryDailyItem> data, StatsResponseMeta meta) {}
}
