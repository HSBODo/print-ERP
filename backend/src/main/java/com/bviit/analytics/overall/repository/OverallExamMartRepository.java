package com.bviit.analytics.overall.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.overall.dto.OverallExamMonthlyItem;
import com.bviit.analytics.overall.dto.OverallExamWeeklyItem;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 전체지표 마트 read 전용 리포지토리.
 *
 * mart_overall_exam_weekly  — (yr, mo, wk) PK 주 단위 종합지표.
 * mart_overall_exam_monthly — (yr, mo)     PK 월 단위 종합지표 (전 연도: 24·25 V14+V16 시드, 26+ 배치).
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OverallExamMartRepository {

    private static final String SELECT_WEEKLY_SQL = SqlLoader.load("sql/mart/select-overall-exam-weekly.sql");
    private static final String SELECT_MONTHLY_SQL = SqlLoader.load("sql/mart/select-overall-exam-monthly.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<OverallExamWeeklyItem> findWeekly(List<Integer> years) {
        return jdbc.query(
                SELECT_WEEKLY_SQL,
                new MapSqlParameterSource("years", years),
                (rs, i) -> OverallExamWeeklyItem.builder()
                        .year(rs.getInt("yr"))
                        .month(rs.getInt("mo"))
                        .week(rs.getInt("wk"))
                        .partial(rs.getBoolean("partial"))
                        .startDate(rs.getString("startDate"))
                        .endDate(rs.getString("endDate"))
                        .totalExam(rs.getInt("totalExam"))
                        .introGeneral(rs.getInt("introGeneral"))
                        .introCustomer(rs.getInt("introCustomer"))
                        .introStaff(rs.getInt("introStaff"))
                        .jobOffice(rs.getInt("jobOffice"))
                        .jobStudent(rs.getInt("jobStudent"))
                        .jobEtc(rs.getInt("jobEtc"))
                        .visionBooked(rs.getInt("visionBooked"))
                        .cataractTotal(rs.getInt("cataractTotal"))
                        .cataractOnly(rs.getInt("cataractOnly"))
                        .cataractBooked(rs.getInt("cataractBooked"))
                        .stopCount(rs.getInt("stopCount"))
                        .visionExam(rs.getInt("visionExam"))
                        .dreamlens(rs.getInt("dreamlens"))
                        .oneDay(rs.getInt("oneDay"))
                        .oneDayBooked(rs.getInt("oneDayBooked"))
                        .build()
        );
    }

    public List<OverallExamMonthlyItem> findMonthly(List<Integer> years) {
        return jdbc.query(
                SELECT_MONTHLY_SQL,
                new MapSqlParameterSource("years", years),
                (rs, i) -> OverallExamMonthlyItem.builder()
                        .year(rs.getInt("yr"))
                        .month(rs.getInt("mo"))
                        .partial(rs.getBoolean("partial"))
                        .totalExam(rs.getInt("totalExam"))
                        .introGeneral(rs.getInt("introGeneral"))
                        .introCustomer(rs.getInt("introCustomer"))
                        .introStaff(rs.getInt("introStaff"))
                        .jobOffice(rs.getInt("jobOffice"))
                        .jobStudent(rs.getInt("jobStudent"))
                        .jobEtc(rs.getInt("jobEtc"))
                        .visionBooked(rs.getInt("visionBooked"))
                        .cataractTotal(rs.getInt("cataractTotal"))
                        .cataractOnly(rs.getInt("cataractOnly"))
                        .cataractBooked(rs.getInt("cataractBooked"))
                        .stopCount(rs.getInt("stopCount"))
                        .visionExam(rs.getInt("visionExam"))
                        .dreamlens(rs.getInt("dreamlens"))
                        .oneDay(rs.getInt("oneDay"))
                        .oneDayBooked(rs.getInt("oneDayBooked"))
                        .build()
        );
    }
}
