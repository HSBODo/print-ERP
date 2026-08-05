package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.exam.dto.ExaminationMonthlyItem;
import com.bviit.analytics.exam.dto.ProcedureExamMonthlyItem;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 검사 마트 read 전용 리포지토리.
 *
 * 대상 테이블:
 *   - mart_examination_monthly       — 시력교정/드림렌즈/백내장 월별 (ExaminationMonthlyItem)
 *   - mart_procedure_exam_monthly    — 검사수/원데이 검사 월별 (ProcedureExamMonthlyItem)
 *   - list_exam                      — 시력교정 검사자 명단 (49필드 계약)
 *   - list_cataract_exam             — 백내장 검사자 명단 (49필드 계약)
 *
 * 반환 shape은 기존 MSSQL 직결 결과와 동일. 컷오버 후 컨트롤러/UI 영향 없음.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ExamStatsMartRepository {

    private static final String SELECT_EXAMINATION_MONTHLY_SQL    = SqlLoader.load("sql/mart/select-examination-monthly.sql");
    private static final String SELECT_PROCEDURE_EXAM_MONTHLY_SQL = SqlLoader.load("sql/mart/select-procedure-exam-monthly.sql");
    private static final String SELECT_LIST_EXAM_SQL              = SqlLoader.load("sql/mart/select-list-exam.sql");
    private static final String SELECT_LIST_CATARACT_EXAM_SQL     = SqlLoader.load("sql/mart/select-list-cataract-exam.sql");
    private static final String SELECT_EXAM_DAILY_AGG_SQL         = SqlLoader.load("sql/mart/select-exam-daily-agg.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    /**
     * 검사 일별 집계 — v_all_exam_list(= 전체 검사자 리스트) 하나에서 뽑는다.
     * 월별은 월로, 주차는 ISO 주차로 각자 접어 쓴다. 두 축이 같은 행에서 나오므로 어긋날 수 없다.
     *
     * ⚠️ 리스트가 적재된 뒤에 호출해야 한다. 배치에서는 list_exam/list_cataract_exam 적재 이후 단계.
     */
    public List<Map<String, Object>> findExamDailyAgg(String from, String to) {
        return jdbc.queryForList(
                SELECT_EXAM_DAILY_AGG_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
        );
    }

    public List<ExaminationMonthlyItem> findExaminationMonthly(List<Integer> years) {
        return jdbc.query(
                SELECT_EXAMINATION_MONTHLY_SQL,
                new MapSqlParameterSource("years", years),
                (rs, i) -> ExaminationMonthlyItem.builder()
                        .year(rs.getInt("yr"))
                        .month(rs.getInt("mo"))
                        .visionCorrection(rs.getInt("visionCorrection"))
                        .dreamlens(rs.getInt("dreamlens"))
                        .cataract(rs.getInt("cataract"))
                        .examTotal(rs.getInt("examTotal"))
                        .total(rs.getInt("total"))
                        .build()
        );
    }

    public List<ProcedureExamMonthlyItem> findProcedureExamMonthly(List<Integer> years) {
        return jdbc.query(
                SELECT_PROCEDURE_EXAM_MONTHLY_SQL,
                new MapSqlParameterSource("years", years),
                (rs, i) -> ProcedureExamMonthlyItem.builder()
                        .year(rs.getInt("yr"))
                        .month(rs.getInt("mo"))
                        .examCount(rs.getInt("examCount"))
                        .oneDayExamCount(rs.getInt("oneDayExamCount"))
                        .total(rs.getInt("total"))
                        .build()
        );
    }

    public List<Map<String, Object>> findExamList(String from, String to) {
        return jdbc.queryForList(
                SELECT_LIST_EXAM_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
        );
    }

    public List<Map<String, Object>> findCataractExamList(String from, String to) {
        return jdbc.queryForList(
                SELECT_LIST_CATARACT_EXAM_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
        );
    }
}
