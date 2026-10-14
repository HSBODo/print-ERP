package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 예약자 리스트 — "예약 종합(콜·온라인)" 월간 건수를 구성하는 검사예약 행 목록.
 *
 * ReservationOverallStatsRepository.findReservationOverallMonthly 의 RESERVATION 집계와 동일 정의(행 단위):
 *   - 검사예약: RESERVE_FLAG='M' + RESERVE_JINRYO IN ('','5','6','7','24','25')
 *   - 집계 기준 날짜: 등록일(InsertedDateTime) — RSS 화면이 등록일로 집계하기 때문(예약일 아님)
 *   - 채널: 콜(CTI=인콜·CRM=아웃콜) + 온라인(ONLINE·APP=홈페이지·NAVER=네이버)
 *   - 공통 제외: B2B군인·재검·중복·시뮬·차트있음(RESERVE_SEQ '8'/'5', COMMENT)을 **콜·온라인 양 채널에** 적용
 *     (예약 종합과 동일. 과거 온라인 미적용 시 중복예약이 월 12~54건 과대계상되던 것 보정 — 2026-06)
 *   - 제외: 테스트/TEST 이름, 공용 더미 고객 8888888888888 (CRM 플레이스홀더)
 *   - 상태(RESERVE_STATE) 필터 없음 — 종합은 등록 시점 기준이라 사후 취소도 포함.
 * 행 1개 = RESERVE_NUM 1개(PK). **명단 행 합계 = 예약 종합 월 값**(둘 다 카카오 미포함).
 *
 * READ-ONLY · MSSQL 2014 호환(TRIM 금지). 날짜 범위는 등록일(InsertedDateTime) 기준.
 *
 * <p><b>소스 라우팅 (data-platform 프로파일)</b>
 * <ul>
 *   <li>기본: CRM 직접연결 (statsJdbcTemplate) + SQL {@link #SQL_MSSQL} · {@link #SQL_ALL_MSSQL}.</li>
 *   <li>data-platform 활성: 데이터 플랫폼 (warehouseJdbcTemplate) + SQL {@link #SQL_WAREHOUSE} · {@link #SQL_ALL_WAREHOUSE}.</li>
 * </ul>
 *
 * <p>정본 전략: {@code docs/data-platform/migration-strategy.md}. 이관 이력: 2026-09-30 A6.
 * 메인 SQL 은 15+ LATERAL + CHARINDEX 메모 파싱 체인 — POSITION/SUBSTRING 조합 등 방언 대량 변환.
 */
@Repository
@Profile("postgres-mart")
public class ReservationListRepository {

    static final String SQL_MSSQL = "sql/softcrm/reservation/list/select-reservation-list.sql";
    static final String SQL_WAREHOUSE = "sql/warehouse/reservation/list/select-reservation-list.sql";
    static final String SQL_ALL_MSSQL = "sql/softcrm/reservation/list/select-reservation-list-all.sql";
    static final String SQL_ALL_WAREHOUSE = "sql/warehouse/reservation/list/select-reservation-list-all.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String reservationListSql;
    private final String reservationListAllSql;

    public ReservationListRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate statsJdbc,
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc,
            @Value("${data-platform.enabled:false}") boolean dataPlatformEnabled
    ) {
        this.jdbc = dataPlatformEnabled ? warehouseJdbc : statsJdbc;
        this.reservationListSql = SqlLoader.load(
                dataPlatformEnabled ? SQL_WAREHOUSE : SQL_MSSQL);
        this.reservationListAllSql = SqlLoader.load(
                dataPlatformEnabled ? SQL_ALL_WAREHOUSE : SQL_ALL_MSSQL);
    }

    public List<Map<String, Object>> findReservationList(String from, String to) {
        return jdbc.queryForList(reservationListSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }

    /**
     * 예약 전체 얇은 리스트 — mart_reservation_monthly(수술/외래/드림렌즈) 재집계용.
     * 검사(M) 예약은 여기서 빠진다 — RESERVE_FLAG='O' OR RESERVE_FLAG='D' OR RESERVE_JINRYO='2'.
     * 예약일(RESERVE_DATE) 기준. 취소(C) 제외.
     */
    public List<Map<String, Object>> findReservationListAll(String from, String to) {
        return jdbc.queryForList(reservationListAllSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
