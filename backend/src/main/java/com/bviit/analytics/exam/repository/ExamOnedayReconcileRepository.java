package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 원데이 검사 소급 보정 리포지토리 — 매월 보정 배치가 부른다.
 *
 * <h3>흐름</h3>
 * <ol>
 *   <li>{@link #findLaterReexamCandidates(LocalDate, LocalDate)} — MSSQL 원본에서
 *       "검사일 이후 재검사(RESERVE_FLAG='M' · RESERVE_JINRYO='2') 예약이 등록된"
 *       (chart_no, exam_date) 쌍 목록 조회.</li>
 *   <li>{@link #markOnedayAsNormal(List)} — Postgres list_exam.one_day='Y' 인 행을 'N' 으로 UPDATE.
 *       조건: MSSQL 결과 쌍에 매칭 + 현재 'Y'. 이미 'N' 인 행은 조용히 skip.</li>
 * </ol>
 *
 * <p>SQL 인라인 대신 리소스 파일로 관리 — CLAUDE.md 규약대로.
 */
@Repository
@Profile("postgres-mart")
public class ExamOnedayReconcileRepository {

    private static final String FIND_CANDIDATES_SQL =
            "sql/softcrm/exam/select-onedays-with-later-reexam.sql";
    private static final String UPDATE_ONEDAY_SQL =
            "sql/mart/exam/update-list-exam-oneday-to-normal.sql";

    private final NamedParameterJdbcTemplate statsJdbc;
    private final NamedParameterJdbcTemplate martJdbc;
    private final String findCandidatesSql;
    private final String updateOnedaySql;

    public ExamOnedayReconcileRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate statsJdbc,
            @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate martJdbc) {
        this.statsJdbc = statsJdbc;
        this.martJdbc = martJdbc;
        this.findCandidatesSql = SqlLoader.load(FIND_CANDIDATES_SQL);
        this.updateOnedaySql = SqlLoader.load(UPDATE_ONEDAY_SQL);
    }

    /**
     * 원데이 → 일반 소급 보정 후보 조회. from..to 는 검사일(EXAM_DATE) 범위.
     * 반환: (chart_no, exam_date) 쌍 목록. 빈 경우 빈 리스트.
     */
    public List<ChartDate> findLaterReexamCandidates(LocalDate from, LocalDate to) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", from.toString())
                .addValue("to", to.toString());
        return statsJdbc.query(findCandidatesSql, params, (rs, i) ->
                new ChartDate(rs.getString("chartNo"), rs.getString("examDate")));
    }

    /**
     * 후보 쌍을 문자열 키(chart|yyyy-MM-dd) 로 concat 해 IN 절에 넣고 UPDATE 실행.
     * 반환: 실제로 갱신된 (chart_no, exam_date) 쌍 목록 (RETURNING 절 활용).
     * 대상이 없으면 즉시 빈 리스트 반환 (빈 IN 절 방지 · 불필요한 쿼리 회피).
     */
    public List<ChartDate> markOnedayAsNormal(List<ChartDate> pairs) {
        if (pairs == null || pairs.isEmpty()) return List.of();
        List<String> keys = new ArrayList<>(pairs.size());
        for (ChartDate p : pairs) {
            if (p.chartNo() == null || p.chartNo().isBlank() || p.examDate() == null || p.examDate().isBlank()) continue;
            keys.add(p.chartNo() + "|" + p.examDate());
        }
        if (keys.isEmpty()) return List.of();
        return martJdbc.query(updateOnedaySql, Map.of("pairKeys", keys), (rs, i) ->
                new ChartDate(rs.getString("chart_no"), rs.getString("exam_date")));
    }

    /** (차트번호, 검사일) 쌍. examDate 는 'YYYY-MM-DD' 문자열 (MSSQL SELECT 결과 형식). */
    public record ChartDate(String chartNo, String examDate) { }
}
