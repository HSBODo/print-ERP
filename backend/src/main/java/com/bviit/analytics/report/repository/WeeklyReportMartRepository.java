package com.bviit.analytics.report.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.report.dto.WeeklyReportItem;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

/**
 * 주차 레포트 mart read — mart_weekly_report 조회.
 *
 * 값이 NULL 이면 "그 주에는 알 수 없음"이라 0 으로 바꾸지 않고 null 을 유지한다(선 끊김).
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class WeeklyReportMartRepository {

    private static final String SELECT_SQL = SqlLoader.load("sql/mart/select-weekly-report.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<WeeklyReportItem> findWeekly(List<Integer> years) {
        if (years == null || years.isEmpty()) return List.of();
        return jdbc.query(
                SELECT_SQL,
                new MapSqlParameterSource().addValue("years", years),
                (rs, rowNum) -> map(rs));
    }

    private static WeeklyReportItem map(ResultSet rs) throws SQLException {
        return WeeklyReportItem.builder()
                .year(rs.getInt("year"))
                .week(rs.getInt("week"))
                .startDate(rs.getString("startDate"))
                .endDate(rs.getString("endDate"))
                .reservations(nullableInt(rs, "reservations"))
                .call(nullableInt(rs, "call"))
                .online(nullableInt(rs, "online"))
                .introGeneral(nullableInt(rs, "introGeneral"))
                .introCustomer(nullableInt(rs, "introCustomer"))
                .introStaff(nullableInt(rs, "introStaff"))
                .jobOffice(nullableInt(rs, "jobOffice"))
                .jobStudent(nullableInt(rs, "jobStudent"))
                .jobEtc(nullableInt(rs, "jobEtc"))
                .examTotal(nullableInt(rs, "examTotal"))
                .visionExam(nullableInt(rs, "visionExam"))
                .cataractExam(nullableInt(rs, "cataractExam"))
                .oneDay(nullableInt(rs, "oneDay"))
                .visionBooked(nullableInt(rs, "visionBooked"))
                .cataractExamEyes(nullableInt(rs, "cataractExamEyes"))
                .cataractBooked(nullableInt(rs, "cataractBooked"))
                .oneDayBooked(nullableInt(rs, "oneDayBooked"))
                .stopCount(nullableInt(rs, "stopCount"))
                .examGeneralBase(nullableInt(rs, "examGeneralBase"))
                .bookedGeneral(nullableInt(rs, "bookedGeneral"))
                .visionSurgery(nullableInt(rs, "visionSurgery"))
                .cataractSurgery(nullableInt(rs, "cataractSurgery"))
                .totalSurgery(nullableInt(rs, "totalSurgery"))
                .outpatient(nullableInt(rs, "outpatient"))
                .dreamlensNew(nullableInt(rs, "dreamlensNew"))
                .dreamlensFu(nullableInt(rs, "dreamlensFu"))
                .build();
    }

    /** SQL NULL 을 0 이 아니라 null 로 보존한다(rs.getInt 는 NULL 을 0 으로 반환). */
    private static Integer nullableInt(ResultSet rs, String column) throws SQLException {
        int value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }
}
