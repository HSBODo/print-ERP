package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.common.util.SqlFragments;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 전체 검사자 리스트 — 시력교정(EXAM) + 백내장(Cataract_Exam) 통합 행 목록.
 *
 * ⚠️ 시력교정(EXAM)·백내장 모두 **사람 단위**다.
 * - 시력교정(EXAM): 리포트 findVisionCorrectionMonthly와 1:1(테스트·백내장스텁 제외), EXAM_DATE 기준.
 *   검사유입(일반/소개/직장인/학생)은 월별 검사자 종합지표(사람)와 정합.
 * - 백내장: 레거시 BCRM "백내장_검사" 화면과 동일하게 **RESERVATION**(FLAG='H' 백내장 + JINRYO='1' 검사진료 +
 *   STATE 내원 I/H) 사람 단위(고객·검사일별 1행). 라이브라 레거시 월값과 ±10 안팎 잔차(다소스·시점차).
 *
 * 산출 필드:
 *   - examGroup  : 시력교정 / 드림렌즈 / 백내장. EXAM은 검사일 드림렌즈예약(RESERVE_FLAG='D')만 있고
 *                  의료예약('M') 없으면 드림렌즈, 아니면 시력교정. 백내장은 RESERVATION(FLAG='H', JINRYO='1') 사람.
 *   - introType  : 일반 / 고객소개(소개고객·소개미확인) / 직원소개(소개직원) — motiveL 기준(종합지표와 동일)
 *   - jobBucket  : 직장인 / 학생 / 기타 — CUSTOM.JOB 기준(종합지표와 동일 CASE, 정합 위해 동기화 유지)
 *
 * 견적·수납·수술상세 등 타입별 상세 컬럼은 기존 개별 리스트(검사자/백내장 검사자 리스트)에 유지.
 * READ-ONLY · MSSQL 2014 호환. EMPLOYEE 조인은 EMP_NUM 중복 시 행 증식 방지로 OUTER APPLY TOP 1.
 */
@Repository
@Profile({"mssql", "postgres-mart"})
public class AllExamListRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String FIND_ALL_EXAM_LIST_SQL = "sql/exam/find-all-exam-list.sql";

    private final String findAllExamListSql;

    public AllExamListRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.findAllExamListSql = SqlLoader.load(FIND_ALL_EXAM_LIST_SQL);
    }

    public List<Map<String, Object>> findAllExamList(String from, String to) {
        String sql = findAllExamListSql.replace(
                "__EXAM_MEASUREMENTS_BLANK__",
                SqlFragments.examMeasurementsBlankPredicate("e")
        );
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
