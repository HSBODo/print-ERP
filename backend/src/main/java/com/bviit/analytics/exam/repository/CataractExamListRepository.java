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
 * 백내장 검사자 리스트 — 성민CRM "백내장 검사자 리스트"(FrmCataract_ExamList) 화면 소스.
 * 소스: Cataract_Exam + Cataract_Operationdata + CUSTOM + EMPLOYEE + RESERVATION(flag 'H') + MOTIVE/COSTPRICE 등.
 * 검사자 리스트(시력교정/EXAM)와 동일한 47필드 계약을 공유하되, 소스 테이블만 백내장 계열로 교체.
 * docs/db/검사자리스트-컬럼정의.md 참조 (백내장 편이 이 문서로 병합됐다).
 *
 * 백내장 특화:
 *   - 예약 진료구분/검사시간/경로 = RESERVE_FLAG='H' 예약 (시력교정의 'M'과 다름)
 *   - 수술불가 = Impossible, 취소메모 = Cancel_reason (EXAM과 컬럼명 다름)
 *   - 견적가/집도의/수술일 = 좌/우(OP_ESTIMATE_R/L, OperationR/L_Doc, OperationR/L_Date) 통합
 *   - 적절한수술방법·수술방법 = IOL 렌즈명
 *
 * READ-ONLY · MSSQL 2014 호환(LTRIM/RTRIM). 날짜는 char(10) 'YYYY-MM-DD'.
 */
@Repository
@Profile("postgres-mart")
public class CataractExamListRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String FIND_CATARACT_EXAM_LIST_SQL = "sql/exam/find-cataract-exam-list.sql";

    private final String findCataractExamListSql;

    public CataractExamListRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.findCataractExamListSql = SqlLoader.load(FIND_CATARACT_EXAM_LIST_SQL);
    }

    public List<Map<String, Object>> findCataractExamList(String from, String to) {
        String sql = findCataractExamListSql;
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
