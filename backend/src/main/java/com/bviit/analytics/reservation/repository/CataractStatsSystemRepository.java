package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownRow;
import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 예약통계_백내장 — 일자별 원시 카운트 라이브 집계(백내장 = RESERVE_FLAG='H').
 *
 * 시력교정 RSS와 동일한 PK+예약날짜 LEFT JOIN 모델. 채널 소스:
 *   - 컨택센터 콜(신규문의/신환/재문의): CtiRptLst(+CtiClg) 백내장 코드
 *   - 카톡(검사예약/노안/취소/문의): HappyTalk 백내장검사·백내장외래
 *   - 온라인예약: RESERVATION(FLAG='H') 온라인경로(ONLINE/APP/NAVER)를 예약등록일(InsertedDateTime) 기준 집계
 *       (2026-07-21: 예약저장 이력시각 → 예약등록일로 변경. 레거시 「온라인예약체크」 데스크 예약등록일 필터와 정합)
 *   - 아웃바운드 TM: DB_CUSTOM(TM팀 4명 KC0307·BV1119·BV1207·BV0067 = 시력교정이 제외하던 직원, B2B 군 제외) — PDF값과 일치
 *   - 총예약(백내장): 채널 예약 합(콜 ★신환 + TM 예약 + 카톡 검사예약 + 온라인예약) — PDF 정의와 일치(캘리브레이션)
 *   - 내원(종합): Cataract_Exam(실제 검사기록, EXAM_DATE, 중단 제외) 중 같은 날 백내장 예약(FLAG='H' I/H) 보유분 — 협진/타과 의뢰 제외, PDF '내원'과 일치
 *   - 부도/취소(종합)·취소(온라인/CRM): RESERVATION(FLAG='H') 예약일 기준
 *
 * 인입콜·응대콜: EICN_MySQL 상담원 그룹 기준(백내장 전담팀 group_code='0016'). 인입 큐는 시력교정과
 * 공유하므로 hunt_number가 아닌 응대 그룹으로 분리한다(시력교정 CH_01과 동일 방식). 2026-06-23 = 29/29 검증.
 * 데이터 미보유로 0 고정인 칸: totalPresbyopia(노안 구분자 부재).
 * 근거: docs/db/예약통계_백내장-데이터소스-분석.md
 *
 * 날짜 바인딩: MSSQL 측은 :from/:to 네임드 파라미터, OPENQUERY 내부(MySQL 리터럴)는 바인딩 불가하므로
 * ISO(yyyy-MM-dd) 재검증 후 __OQ_FROM__/__OQ_TO__ 치환(주입 방지, 시력교정 repo와 동일 패턴).
 *
 * READ-ONLY · MSSQL 2014 호환(WITH(NOLOCK), 네임드 파라미터 :from/:to).
 */
@Repository
@Profile("postgres-mart")
public class CataractStatsSystemRepository {

    private static final String SQL_LOCATION = "sql/reservation/stats/cataract-daily-counts.sql";
    private static final String DRILL_DOWN_SQL_LOCATION = "sql/reservation/stats/cataract-drill-down.sql";
    private static final String ISO_DATE = "\\d{4}-\\d{2}-\\d{2}";

    private final NamedParameterJdbcTemplate jdbc;
    private final String sql;
    private final String drillDownSql;

    public CataractStatsSystemRepository(@Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.sql = SqlLoader.load(SQL_LOCATION);
        this.drillDownSql = SqlLoader.load(DRILL_DOWN_SQL_LOCATION);
    }

    public List<CataractStatsDailyRow> findDailyCounts(String from, String to) {
        String resolvedSql = resolveOpenQuerySql(sql, from, to);
        return jdbc.query(resolvedSql,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, n) -> new CataractStatsDailyRow(
                        rs.getString("d"),
                        rs.getInt("totalCataract"), rs.getInt("totalPresbyopia"),
                        rs.getInt("inboundCall"), rs.getInt("answeredCall"),
                        rs.getInt("newExamInquiry"), rs.getInt("newReInquiry"), rs.getInt("newPatient"),
                        rs.getInt("tmTotalDb"), rs.getInt("tmValidDb"), rs.getInt("tmReservation"),
                        rs.getInt("kakaoTotalInquiry"), rs.getInt("kakaoCataractReservation"), rs.getInt("kakaoPresbyopiaReservation"),
                        rs.getInt("onlineReservation"), rs.getInt("onlineNoShow"),
                        rs.getInt("cancelOnline"), rs.getInt("cancelCrm"), rs.getInt("cancelKakao"),
                        rs.getInt("visit"), rs.getInt("noShowReservation"), rs.getInt("cancel")));
    }

    static String resolveOpenQuerySql(String baseSql, String from, String to) {
        // OPENQUERY 리터럴 치환 전 ISO 형식 재검증(주입 방지). 컨트롤러가 LocalDate로 이미 검증하나 이중 가드.
        if (from == null || to == null || !from.matches(ISO_DATE) || !to.matches(ISO_DATE)) {
            throw new IllegalArgumentException("from/to must be ISO yyyy-MM-dd dates");
        }
        return baseSql.replace("__OQ_FROM__", from).replace("__OQ_TO__", to);
    }

    public List<ReservationStatsDrillDownRow> findDrillDownRows(String date, String field) {
        return jdbc.query(drillDownSql,
                new MapSqlParameterSource().addValue("date", date).addValue("field", field),
                (rs, n) -> new ReservationStatsDrillDownRow(
                        rs.getString("d"),
                        rs.getString("field"),
                        rs.getString("source"),
                        rs.getString("gb"),
                        rs.getString("gb2"),
                        rs.getString("primaryKey"),
                        rs.getString("custNum"),
                        rs.getString("reserveNum"),
                        rs.getString("reserveState"),
                        rs.getString("exclusionReasonCandidate"),
                        rs.getInt("contribution")));
    }
}
