package com.bviit.analytics.batch.job;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.overall.dto.OverallExamWeeklyItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 전체지표 도메인 마트 write 컴포넌트 — PR-12.
 *
 * mart_overall_exam_weekly upsert. (yr, mo, wk) PK 기준 idempotent.
 * 월 경계 클립·partial 여부는 서비스가 계산한 결과를 그대로 저장.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OverallMartWriter {

    private static final String UPSERT_SQL = SqlLoader.load("sql/mart/upsert-overall-exam-weekly.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    @Transactional
    public int upsertWeekly(List<OverallExamWeeklyItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(OverallMartWriter::toParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_SQL, batch);
        int total = sum(updated);
        log.info("mart_overall_exam_weekly upserted rows={}", total);
        return total;
    }

    private static SqlParameterSource toParams(OverallExamWeeklyItem m) {
        return new MapSqlParameterSource()
                .addValue("yr", m.getYear())
                .addValue("mo", m.getMonth())
                .addValue("wk", m.getWeek())
                .addValue("partial", m.isPartial())
                .addValue("startDate", m.getStartDate())
                .addValue("endDate", m.getEndDate())
                .addValue("totalExam", m.getTotalExam())
                .addValue("introGeneral", m.getIntroGeneral())
                .addValue("introCustomer", m.getIntroCustomer())
                .addValue("introStaff", m.getIntroStaff())
                .addValue("jobOffice", m.getJobOffice())
                .addValue("jobStudent", m.getJobStudent())
                .addValue("jobEtc", m.getJobEtc())
                .addValue("visionBooked", m.getVisionBooked())
                .addValue("cataractTotal", m.getCataractTotal())
                .addValue("cataractOnly", m.getCataractOnly())
                .addValue("cataractBooked", m.getCataractBooked())
                .addValue("stopCount", m.getStopCount())
                .addValue("visionExam", m.getVisionExam())
                .addValue("dreamlens", m.getDreamlens())
                .addValue("oneDay", m.getOneDay())
                .addValue("oneDayBooked", m.getOneDayBooked());
    }

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
