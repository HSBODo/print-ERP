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
 * 검사 중단(EXAM.STOP_YN='Y') 건을 상담사가 드롭다운에서 고른 정형 코드 EXAM.CANCEL_CD(char(3))로
 * 분류한 월별 사유별 건수. 코드 마스터는 CANCEL_CFG.
 *
 * 매핑 — 코드군이 두 벌이다: 1xx(검사 중단) / 3xx(동일 라벨 세트). 새 코드 추가 시 짝이 있는지 확인할 것.
 *   recommendX     불가-수술권유X    121 · 305
 *   lensImpossible 불가-렌즈삽입불가  122 · 306 · 399
 *   keratoconus    불가-원추각막     124 · 125 · 308 · 309
 *   avellino       불가-아벨리노     126 · 310
 *   glaucoma       불가-녹내장       114 · 303
 *   visionChange   불가-시력변화     111 · 302
 *   other          기타             107 · 199 · 117 · 304 · 127 · 311 · 그 외 미지 코드
 *
 * 그룹: other · glaucoma · visionChange = '잠정 중단' / 나머지 4개 = '수술 불가'.
 *   117(불가_백내장FU) · 127(불가_기타 각막병증)은 라벨이 '불가_' 지만 기타(=잠정 중단)로
 *   귀속하기로 결정(2026-07-15). ELSE 로 흘리지 않고 SQL 에 WHEN 으로 명시해 뒀다.
 *
 * ⚠️ ELSE 로 떨어지는 미지 코드는 에러 없이 조용히 other 가 되어 티가 안 난다.
 * ⚠️ CANCEL_CD 는 이름과 달리 '취소 플래그'가 아니라 '중단 사유 코드'다. 다른 쿼리들은 같은 컬럼을
 *   취소 판정(ISNULL(e.CANCEL_CD,'') = '')에 쓴다 — 같은 컬럼, 두 용도.
 *
 * 분류 규칙 본체는 sql/softcrm/consultation/select-stop-reason-monthly.sql 의 CASE 문 한 곳.
 * 매핑 변경 절차·검증 쿼리·함정은 docs/db/중단사유-분류-정의.md 참조.
 *
 * READ-ONLY — SELECT만 실행. 날짜 컬럼은 char(10) 'YYYY-MM-DD'.
 */
@Repository
@Profile("postgres-mart")
public class StopReasonStatsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String FIND_STOP_REASON_MONTHLY_SQL = "sql/softcrm/consultation/select-stop-reason-monthly.sql";

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
