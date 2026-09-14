package com.bviit.analytics.sms.repository;

import com.bviit.analytics.common.util.SqlLoader;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 마트에 번호가 없는 대상의 연락처를 CRM(MSSQL)에서 직접 찾는 보조 조회.
 *
 * 화면 조회 경로가 아니라 **불러오기(관리자 액션) 시점**에만 쓴다 — 터널이 끊겨 있으면
 * 번호를 못 채울 뿐이고(빈 값 → '번호 없음'), 화면과 다른 기능은 영향받지 않는다.
 */
@Slf4j
@Repository
// statsJdbcTemplate(MSSQL) 은 두 프로파일 모두에서 제공된다(StatsDataSourceConfig · MartDataSourceConfig).
// 예약자 리스트 리포지토리와 같은 조건을 쓴다.
@Profile({"mssql", "postgres-mart"})
public class SmsCrmContactRepository {

    private static final String SELECT_PHONE_SQL = SqlLoader.load("sql/sms/select-crm-phone.sql");

    private final NamedParameterJdbcTemplate jdbc;

    /**
     * ⚠️ 생성자를 직접 쓴다. 필드에 @Qualifier 를 달고 @RequiredArgsConstructor 를 쓰면
     *    Lombok 이 그 애노테이션을 생성자 파라미터로 옮기지 않아, 타입만 보고 @Primary 인
     *    martJdbcTemplate(Postgres)이 주입된다. 그러면 MSSQL 문법(SELECT TOP 1)이
     *    Postgres 로 날아가 문법 오류가 나고, 진행 중인 트랜잭션까지 abort 된다(실제 발생).
     */
    public SmsCrmContactRepository(@Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 못 찾거나 조회에 실패하면 빈 문자열 — 불러오기 전체를 실패시키지 않는다. */
    public String findPhone(String chartNo) {
        try {
            List<String> rows = jdbc.queryForList(
                    SELECT_PHONE_SQL, new MapSqlParameterSource("chartNo", chartNo), String.class);
            return rows.isEmpty() || rows.get(0) == null ? "" : rows.get(0).trim();
        } catch (Exception e) {
            log.warn("CRM 연락처 조회 실패: chartNo={}, reason={}", chartNo, e.getMessage());
            return "";
        }
    }
}
