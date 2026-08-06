package com.bviit.analytics.batch.job;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.report.dto.WeeklyReportItem;
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
import java.util.Map;

/**
 * 레포트 도메인 마트 write 컴포넌트.
 *
 * mart_weekly_report      upsert — (yr, wk) PK 기준 idempotent.
 * mart_exam_count_by_class upsert — (yr, mo, motive_report) PK 기준 idempotent.
 *
 * null 값은 0 으로 바꾸지 않고 그대로 저장한다("알 수 없음"과 0 을 구분).
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReportMartWriter {

    private static final String UPSERT_WEEKLY_SQL = SqlLoader.load("sql/mart/upsert-weekly-report.sql");
    private static final String UPSERT_BY_CLASS_SQL = SqlLoader.load("sql/mart/upsert-exam-count-by-class.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    @Transactional
    public int upsertWeekly(List<WeeklyReportItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(ReportMartWriter::toWeeklyParams)
                .toArray(SqlParameterSource[]::new);
        int total = sum(jdbc.batchUpdate(UPSERT_WEEKLY_SQL, batch));
        log.info("mart_weekly_report upserted rows={}", total);
        return total;
    }

    /**
     * 고객분류별 검사수 적재. rows 는 {month, motiveReport, cnt} shape
     * (find-exam-count-by-class-monthly.sql 출력) 이고 연도는 호출자가 넘긴다.
     */
    @Transactional
    public int upsertExamCountByClass(int year, List<Map<String, Object>> rows) {
        if (rows.isEmpty()) return 0;
        SqlParameterSource[] batch = rows.stream()
                .map(r -> (SqlParameterSource) new MapSqlParameterSource()
                        .addValue("yr", year)
                        .addValue("mo", intOf(r.get("month")))
                        .addValue("motiveReport", String.valueOf(r.get("motiveReport")))
                        .addValue("cnt", intOf(r.get("cnt"))))
                .toArray(SqlParameterSource[]::new);
        int total = sum(jdbc.batchUpdate(UPSERT_BY_CLASS_SQL, batch));
        log.info("mart_exam_count_by_class upserted year={} rows={}", year, total);
        return total;
    }

    private static SqlParameterSource toWeeklyParams(WeeklyReportItem w) {
        return new MapSqlParameterSource()
                .addValue("yr", w.getYear())
                .addValue("wk", w.getWeek())
                .addValue("startDate", w.getStartDate())
                .addValue("endDate", w.getEndDate())
                .addValue("reservations", w.getReservations())
                .addValue("call", w.getCall())
                .addValue("online", w.getOnline())
                .addValue("introGeneral", w.getIntroGeneral())
                .addValue("introCustomer", w.getIntroCustomer())
                .addValue("introStaff", w.getIntroStaff())
                .addValue("jobOffice", w.getJobOffice())
                .addValue("jobStudent", w.getJobStudent())
                .addValue("jobEtc", w.getJobEtc())
                .addValue("examTotal", w.getExamTotal())
                .addValue("visionExam", w.getVisionExam())
                .addValue("cataractExam", w.getCataractExam())
                .addValue("oneDay", w.getOneDay())
                .addValue("visionBooked", w.getVisionBooked())
                .addValue("cataractExamEyes", w.getCataractExamEyes())
                .addValue("cataractBooked", w.getCataractBooked())
                .addValue("oneDayBooked", w.getOneDayBooked())
                .addValue("stopCount", w.getStopCount())
                .addValue("examGeneralBase", w.getExamGeneralBase())
                .addValue("bookedGeneral", w.getBookedGeneral())
                .addValue("visionSurgery", w.getVisionSurgery())
                .addValue("cataractSurgery", w.getCataractSurgery())
                .addValue("totalSurgery", w.getTotalSurgery())
                .addValue("reoperation", w.getReoperation())
                .addValue("reopLaser", w.getReopLaser())
                .addValue("reopLens", w.getReopLens())
                .addValue("outpatient", w.getOutpatient());
    }

    private static int intOf(Object value) {
        return value instanceof Number n ? n.intValue() : 0;
    }

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
