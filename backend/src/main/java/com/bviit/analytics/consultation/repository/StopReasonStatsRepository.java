package com.bviit.analytics.consultation.repository;

import com.bviit.analytics.common.util.SqlLoader;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 검사 중단 사유 통계 쿼리.
 *
 * 검사 중단(EXAM.STOP_YN='Y') 건을 EXAM_MEMO 키워드로 분류한 월별 사유별 건수.
 * ⚠️ 중단 사유는 DB에 코드가 없고 EXAM_MEMO(자유텍스트)에만 있어 키워드 LIKE로 추정한다.
 *   분류 우선순위(위에서 먼저 매칭): 아벨리노 > 원추각막 > 녹내장 > 렌즈삽입 > 시력변화 > 수술권유X > 기타.
 *   메모는 공백/탭/개행 제거 + 소문자화 후 매칭('권유 x'·'권유X' → '권유x').
 *   약어·표기 변형(렌삽/ICL, 권유안/비권유/수술불가, 시력변동 등)을 함께 잡는다.
 *
 * READ-ONLY — SELECT만 실행. 날짜 컬럼은 char(10) 'YYYY-MM-DD'.
 */
@Repository
@Profile({"mssql", "postgres-mart"})
public class StopReasonStatsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String FIND_STOP_REASON_MONTHLY_SQL = "sql/consultation/find-stop-reason-monthly.sql";

    private final String findStopReasonMonthlySql;

    public StopReasonStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.findStopReasonMonthlySql = SqlLoader.load(FIND_STOP_REASON_MONTHLY_SQL);
    }

    /** 월별 중단 사유 분류 건수. */
    public List<Map<String, Object>> findStopReasonMonthly(String from, String to) {
        String sql = findStopReasonMonthlySql;
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
