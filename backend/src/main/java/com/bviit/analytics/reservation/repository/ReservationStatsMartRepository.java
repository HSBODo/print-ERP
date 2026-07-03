package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 예약 마트 read 전용 리포지토리.
 *
 * 대상 테이블:
 *   - mart_reservation_monthly        : 월별 수술/외래/드림렌즈 (ReservationMonthlyItem)
 *   - list_reservation                : 예약자 명단 행 (reservation-list.sql 출력 shape)
 *   - mart_reservation_kakao_daily    : 카카오(해피톡) 일별 건수 → 범위 SUM
 *
 * 반환 shape은 기존 MSSQL 직결 결과와 동일. 컷오버 후 컨트롤러/UI 영향 없음.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationStatsMartRepository {

    private static final String SELECT_MONTHLY_SQL     = SqlLoader.load("sql/mart/select-reservation-monthly.sql");
    private static final String SELECT_LIST_SQL        = SqlLoader.load("sql/mart/select-list-reservation.sql");
    private static final String SELECT_KAKAO_COUNT_SQL = SqlLoader.load("sql/mart/select-reservation-kakao-count.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<ReservationMonthlyItem> findMonthly(List<Integer> years) {
        return jdbc.query(
                SELECT_MONTHLY_SQL,
                new MapSqlParameterSource("years", years),
                (rs, i) -> ReservationMonthlyItem.builder()
                        .year(rs.getInt("yr"))
                        .month(rs.getInt("mo"))
                        .surgery(rs.getInt("surgery"))
                        .outpatient(rs.getInt("outpatient"))
                        .dreamlens(rs.getInt("dreamlens"))
                        .total(rs.getInt("total"))
                        .build()
        );
    }

    public List<Map<String, Object>> findList(String from, String to) {
        return jdbc.queryForList(
                SELECT_LIST_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
        );
    }

    /**
     * 카카오(해피톡) 요청 범위 총 건수. 마트는 일별로 저장돼 있고 응답은 SUM(int).
     */
    public int findKakaoCount(String from, String to) {
        Integer count = jdbc.queryForObject(
                SELECT_KAKAO_COUNT_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                Integer.class
        );
        return count == null ? 0 : count;
    }
}
