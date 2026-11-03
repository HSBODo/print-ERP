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
 * 마트에 번호가 없는 대상의 연락처를 웨어하우스(raw.raw_crm_custom)에서 직접 찾는 보조 조회.
 *
 * <p>화면 조회 경로가 아니라 **불러오기(관리자 액션) 시점**에만 쓴다 — 조회에 실패해도
 * 번호를 못 채울 뿐이고(빈 값 → '번호 없음'), 화면과 다른 기능은 영향받지 않는다.
 */
@Slf4j
@Repository
@Profile("postgres-mart")
public class SmsCrmContactRepository {

    static final String SELECT_PHONE_SQL = "sql/warehouse/sms/select-crm-phone.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String selectPhoneSql;

    /**
     * ⚠️ 생성자를 직접 쓴다. 필드에 @Qualifier 를 달고 @RequiredArgsConstructor 를 쓰면
     *    Lombok 이 그 애노테이션을 생성자 파라미터로 옮기지 않아, 타입만 보고 @Primary 인
     *    martJdbcTemplate 이 주입된다 — 명시적 @Qualifier 바인딩으로 그 사고를 막는다.
     */
    public SmsCrmContactRepository(
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc) {
        this.jdbc = warehouseJdbc;
        this.selectPhoneSql = SqlLoader.load(SELECT_PHONE_SQL);
    }

    /** 못 찾거나 조회에 실패하면 빈 문자열 — 불러오기 전체를 실패시키지 않는다. */
    public String findPhone(String chartNo) {
        try {
            List<String> rows = jdbc.queryForList(
                    selectPhoneSql, new MapSqlParameterSource("chartNo", chartNo), String.class);
            return rows.isEmpty() || rows.get(0) == null ? "" : rows.get(0).trim();
        } catch (Exception e) {
            log.warn("CRM 연락처 조회 실패: chartNo={}, reason={}", chartNo, e.getMessage());
            return "";
        }
    }
}
