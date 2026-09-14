package com.bviit.analytics.surgery.service;

import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.repository.SurgeryStatsMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/**
 * 수술별 비중 일별 — Postgres 마트({@code mart_surgery_daily})에서 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary 라 {@link SurgeryCompositionReader} 주입 시 이 구현이 선택된다.
 * 덕분에 화면이 MSSQL(SSH 터널·VPN)에 의존하지 않는다 — 매일 03:00 배치({@code SurgeryMartJob})가
 * MSSQL 소스를 읽어 마트에 upsert 해둔 값을 그대로 서빙한다.
 *
 * <p>과거의 월별 JSON 스냅샷 규약은 폐지됐다 — 마트 upsert 가 같은 역할을 대체한다.
 * 조회 시점에 MSSQL 을 두드리는 read-through fill 도 없다.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class SurgeryCompositionMartQueryService implements SurgeryCompositionReader {

    private static final String FORMULA_VERSION = "surgery-composition-daily-v1";
    private static final int SCHEMA_VERSION = 1;

    private final SurgeryStatsMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public DailyResult getDaily(LocalDate from, LocalDate to, String username) {
        List<SurgeryDailyItem> data = martRepository.findDaily(from.toString(), to.toString());
        // 표시용 period 는 조회 시작 월. 여러 달에 걸친 조회에서도 배지 1개만 필요.
        String period = YearMonth.from(from).toString();
        StatsResponseMeta meta = StatsResponseMeta.mart(period, FORMULA_VERSION, SCHEMA_VERSION);
        return new DailyResult(data, meta);
    }
}
