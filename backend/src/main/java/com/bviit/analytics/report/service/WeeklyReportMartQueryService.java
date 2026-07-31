package com.bviit.analytics.report.service;

import com.bviit.analytics.report.dto.WeeklyReportItem;
import com.bviit.analytics.report.repository.WeeklyReportMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 주차 레포트 — Postgres 마트에서 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary 라 {@link WeeklyReportReader} 주입 시 이 구현이 선택된다.
 * 덕분에 화면이 MSSQL(SSH 터널·VPN)에 의존하지 않는다 — 터널이 끊겨도 마지막 적재분이 그대로 뜬다.
 * 적재는 {@code ReportMartJob} 이 {@link WeeklyReportService}(MSSQL 직결)를 호출해 수행한다.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class WeeklyReportMartQueryService implements WeeklyReportReader {

    private final WeeklyReportMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<WeeklyReportItem> getWeeklyStats(List<Integer> years) {
        return martRepository.findWeekly(years);
    }
}
