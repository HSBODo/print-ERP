package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlLoader;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 검사자 리스트(상담사별) — 성민CRM "검사자 리스트" 화면 소스를 옮긴 행 목록 쿼리.
 * 소스: EXAM + CUSTOM + OPERATIONDATA + EMPLOYEE(×3) + RESERVATION (docs/db/검사자리스트-컬럼정의.md).
 *
 * 78개 원본 컬럼 중 검사정보1~30(측정값)을 제외한 비측정 컬럼만 반환한다.
 * 컬럼 별칭(camelCase)이 그대로 JSON 키가 되어 프론트 Zod 스키마와 1:1 매칭된다 — DTO 불필요.
 * 모든 컬럼은 ISNULL(...,'')로 감싸 항상 문자열을 보장한다(프론트 z.string()).
 *
 * 주민번호는 PII라 빈 문자열 placeholder.
 * 예약경로/섹션/내원동기/집도의/수납금액/보험사/국적은 확인된 SOFTCRM 컬럼으로 채운다.
 *
 * READ-ONLY · MSSQL 2014 호환(TRIM 금지 → LTRIM/RTRIM). 날짜는 char(10) 'YYYY-MM-DD'.
 */
@Repository
@Profile({"mssql", "postgres-mart"})
public class ExamListRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String FIND_EXAM_LIST_SQL = "sql/exam/find-exam-list.sql";

    private final String findExamListSql;

    public ExamListRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.findExamListSql = SqlLoader.load(FIND_EXAM_LIST_SQL);
    }

    public List<Map<String, Object>> findExamList(String from, String to) {
        String sql = findExamListSql;
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
