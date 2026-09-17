package com.bviit.analytics.marketing.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.marketing.dto.OverseasMarketingReceptionQuery;
import com.bviit.analytics.marketing.util.OverseasCustomerKeys;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Google Sheet 로컬 캐시와 원본 CRM(SOFTCRM) 직결 조회를 분리한 저장소. */
@Repository
@Profile("postgres-mart")
public class OverseasMarketingRepository {

    private static final String RECEPTIONS_SQL = SqlLoader.load("sql/mart/marketing/receptions.sql");
    private static final String OUTPATIENT_SQL = SqlLoader.load("sql/softcrm/marketing/outpatient-enrichment.sql");
    private static final String PRICE_ITEM_COSTS_SQL = SqlLoader.load("sql/softcrm/marketing/price-item-costs.sql");
    private static final String FALLBACK_COSTS_SQL = SqlLoader.load("sql/softcrm/marketing/fallback-costs.sql");
    private static final String CUSTOMER_CANDIDATES_SQL = SqlLoader.load("sql/softcrm/marketing/customer-candidates.sql");
    private static final String CUSTOMER_DETAILS_SQL = SqlLoader.load("sql/softcrm/marketing/customer-details.sql");
    private static final String SYNC_INSERT_SQL = SqlLoader.load("sql/mart/marketing/sync-insert.sql");
    private static final String MANUAL_INSERT_SQL = SqlLoader.load("sql/mart/marketing/manual-insert.sql");
    private static final String ROW_UPDATE_SQL = SqlLoader.load("sql/mart/marketing/row-update.sql");
    private static final String SHEET_MONTHLY_SQL = SqlLoader.load("sql/mart/marketing/sheet-monthly.sql");
    private static final String RSV_STATS_SELECT_SQL = SqlLoader.load("sql/mart/marketing/reservation-stats-select.sql");
    private static final String RSV_STATS_UPSERT_SQL = SqlLoader.load("sql/mart/marketing/reservation-stats-upsert.sql");
    private static final String RSV_STATS_SOURCE_SQL = SqlLoader.load("sql/mart/marketing/reservation-stats-source.sql");

    // jtds는 네트워크 타임아웃을 지원하지 않아 느린 쿼리가 요청을 무한정 붙잡을 수 있다.
    // 이 저장소의 CRM 조회에만 쿼리 타임아웃을 걸어 동기화가 hang 되지 않게 한다(다른 통계 조회에는 영향 없음).
    private static final int CRM_QUERY_TIMEOUT_SECONDS = 120;

    private final NamedParameterJdbcTemplate martJdbc;
    private final NamedParameterJdbcTemplate crmJdbc;

    public OverseasMarketingRepository(
            @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate martJdbc,
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate crmJdbc
    ) {
        this.martJdbc = martJdbc;
        org.springframework.jdbc.core.JdbcTemplate timedTemplate =
                new org.springframework.jdbc.core.JdbcTemplate(
                        java.util.Objects.requireNonNull(crmJdbc.getJdbcTemplate().getDataSource()));
        timedTemplate.setQueryTimeout(CRM_QUERY_TIMEOUT_SECONDS);
        this.crmJdbc = new NamedParameterJdbcTemplate(timedTemplate);
    }

    public List<Map<String, Object>> findReceptions(OverseasMarketingReceptionQuery query) {
        return martJdbc.queryForList(RECEPTIONS_SQL, new MapSqlParameterSource()
                .addValue("from", query.from())
                .addValue("to", query.to())
                .addValue("dateType", query.dateType())
                .addValue("dateEnabled", query.dateEnabled() ? 1 : 0)
                .addValue("status", query.status()));
    }

    public List<Map<String, Object>> findCandidatesByNames(List<String> names) {
        return findCandidates("c.CUST_NAME IN (:values)", names);
    }

    /**
     * 전화 뒷8자리·이메일 매칭 후보를 CUSTOM 전체 스트림 1회로 함께 조회한다.
     *
     * 이유(2026-09-16 실장애) — 전화 뒷8자리 매칭은 원래 SQL 이
     * {@code RIGHT(REPLACE(REPLACE(REPLACE(CALL_NUM2, '-', ''), ' ', ''), '+', ''), 8) IN (:values)}
     * 였으나 컬럼에 함수를 씌워 non-sargable 이라 CUSTOM(58만+ 행) 전수 스캔 + 행마다 정규화 계산이
     * 필요해 120s 타임아웃을 초과했다. 이메일도 같은 패턴이라 시간 문제였다. 대신 CUSTOM 전체를
     * 스트림으로 받아 자바에서 필터링하면 왕복 1회로 끝나고, 서버는 인덱스 없는 순수 스캔만 하면 된다.
     * 정규화 규칙은 {@link OverseasCustomerKeys} 로 저장소·서비스가 공유한다.
     */
    public PhoneEmailCandidates findCandidatesByPhoneOrEmail(Set<String> phoneSuffixes, Set<String> emails) {
        List<Map<String, Object>> phoneMatches = new ArrayList<>();
        List<Map<String, Object>> emailMatches = new ArrayList<>();
        if (phoneSuffixes.isEmpty() && emails.isEmpty()) {
            return new PhoneEmailCandidates(phoneMatches, emailMatches);
        }
        Set<String> phoneKeys = Set.copyOf(phoneSuffixes);
        Set<String> emailKeys = Set.copyOf(emails);
        JdbcTemplate raw = crmJdbc.getJdbcTemplate();
        int previousFetchSize = raw.getFetchSize();
        raw.setFetchSize(CUSTOMER_STREAM_FETCH_SIZE);
        try {
            raw.query(CUSTOMER_STREAM_SQL, rs -> {
                String customerNo = rs.getString("customerNo");
                String name = rs.getString("name");
                String birthDate = rs.getString("birthDate");
                String contact = rs.getString("contact");
                String email = rs.getString("email");
                if (!phoneKeys.isEmpty()) {
                    String suffix = OverseasCustomerKeys.phoneSuffix(contact);
                    if (!suffix.isEmpty() && phoneKeys.contains(suffix)) {
                        phoneMatches.add(candidateRow(customerNo, name, birthDate, contact, email));
                    }
                }
                if (!emailKeys.isEmpty()) {
                    String normalized = OverseasCustomerKeys.email(email);
                    if (!normalized.isEmpty() && emailKeys.contains(normalized)) {
                        emailMatches.add(candidateRow(customerNo, name, birthDate, contact, email));
                    }
                }
            });
        } finally {
            raw.setFetchSize(previousFetchSize);
        }
        return new PhoneEmailCandidates(phoneMatches, emailMatches);
    }

    private static Map<String, Object> candidateRow(String customerNo, String name, String birthDate,
                                                    String contact, String email) {
        Map<String, Object> row = new HashMap<>();
        row.put("customerNo", customerNo);
        row.put("name", name);
        row.put("birthDate", birthDate);
        row.put("contact", contact);
        row.put("email", email);
        return row;
    }

    public record PhoneEmailCandidates(
            List<Map<String, Object>> phones,
            List<Map<String, Object>> emails
    ) {}

    private static final String CUSTOMER_STREAM_SQL =
            "SELECT RTRIM(c.CUST_NUM) AS customerNo, "
                    + "RTRIM(ISNULL(c.CUST_NAME, '')) AS name, "
                    + "ISNULL(c.BIRTH_DAY, '') AS birthDate, "
                    + "ISNULL(c.CALL_NUM2, '') AS contact, "
                    + "ISNULL(c.EMAIL, '') AS email "
                    + "FROM CUSTOM c WITH(NOLOCK)";

    private static final int CUSTOMER_STREAM_FETCH_SIZE = 2000;

    // MSSQL prepared statement 파라미터 한도(2,100)를 넘지 않도록 IN 절 값을 나눠 조회한다.
    private static final int IN_CLAUSE_CHUNK = 1000;

    public List<Map<String, Object>> findCustomerDetails(List<String> customerNos) {
        return chunkedQuery(CUSTOMER_DETAILS_SQL, "customerNos", customerNos);
    }

    private List<Map<String, Object>> findCandidates(String predicate, List<String> values) {
        return chunkedQuery(CUSTOMER_CANDIDATES_SQL.formatted(predicate), "values", values);
    }

    private static final String EXAM_DATE_CANDIDATES_SQL = SqlLoader.load("sql/softcrm/marketing/exam-date-candidates.sql");
    private static final String SURGERY_DATE_CANDIDATES_SQL = SqlLoader.load("sql/softcrm/marketing/surgery-date-candidates.sql");

    /** 해당 날짜들에 검사예약이 있던 고객 — 날짜가 후보군을 좁혀 이름·생일 대조 매칭에 쓴다. */
    public List<Map<String, Object>> findExamDateCandidates(List<String> dates) {
        return chunkedDateQuery(EXAM_DATE_CANDIDATES_SQL, dates);
    }

    /** 해당 날짜들에 수술 기록이 있는 고객. */
    public List<Map<String, Object>> findSurgeryDateCandidates(List<String> dates) {
        return chunkedDateQuery(SURGERY_DATE_CANDIDATES_SQL, dates);
    }

    /** 날짜 IN 조회 — 원본 컬럼 범위(:from~:toExclusive)를 함께 걸어 인덱스 스캔을 보장한다. */
    private List<Map<String, Object>> chunkedDateQuery(String sql, List<String> dates) {
        if (dates.isEmpty()) return List.of();
        List<Map<String, Object>> results = new java.util.ArrayList<>();
        for (int from = 0; from < dates.size(); from += IN_CLAUSE_CHUNK) {
            List<String> chunk = dates.subList(from, Math.min(from + IN_CLAUSE_CHUNK, dates.size()));
            String min = java.util.Collections.min(chunk);
            String maxExclusive = java.time.LocalDate.parse(java.util.Collections.max(chunk)).plusDays(1).toString();
            results.addAll(crmJdbc.queryForList(sql, new MapSqlParameterSource()
                    .addValue("values", chunk)
                    .addValue("from", min)
                    .addValue("toExclusive", maxExclusive)));
        }
        return results;
    }

    public List<Map<String, Object>> findOutpatientVisits(List<String> customerNos) {
        return chunkedQuery(OUTPATIENT_SQL, "customerNos", customerNos);
    }

    public List<Map<String, Object>> findPriceItemCosts(List<String> customerNos) {
        return chunkedQuery(PRICE_ITEM_COSTS_SQL, "customerNos", customerNos);
    }

    public List<Map<String, Object>> findFallbackCosts(List<String> customerNos) {
        return chunkedQuery(FALLBACK_COSTS_SQL, "customerNos", customerNos);
    }

    private List<Map<String, Object>> chunkedQuery(String sql, String paramName, List<String> values) {
        if (values.isEmpty()) return List.of();
        List<Map<String, Object>> results = new java.util.ArrayList<>();
        for (int from = 0; from < values.size(); from += IN_CLAUSE_CHUNK) {
            List<String> chunk = values.subList(from, Math.min(from + IN_CLAUSE_CHUNK, values.size()));
            results.addAll(crmJdbc.queryForList(sql, Map.of(paramName, chunk)));
        }
        return results;
    }

    public void replaceSheetRows(MapSqlParameterSource[] rows) {
        // 화면에서 수정한 시트 행(updated_by 존재), 수기 추가 행(origin='manual'),
        // 담당자가 직접 확정한 수동 매칭 행(matched_by가 사용자 ID)은 보존한다.
        martJdbc.getJdbcTemplate().execute(
                "DELETE FROM overseas_marketing_sheet WHERE origin = 'sheet' AND updated_by IS NULL"
                        + " AND COALESCE(matched_by, 'CRM_Sync') = 'CRM_Sync'");
        if (rows.length > 0) {
            martJdbc.batchUpdate(SYNC_INSERT_SQL, rows);
        }
        // 동기화 시점에 존재하는 모든 행은 이후 삭제 불가(수정만 가능).
        martJdbc.getJdbcTemplate().execute(
                "UPDATE overseas_marketing_sheet SET locked_at = CURRENT_TIMESTAMP WHERE locked_at IS NULL");
    }

    public long insertManualRow(MapSqlParameterSource params) {
        Long rowNumber = martJdbc.queryForObject(MANUAL_INSERT_SQL, params, Long.class);
        if (rowNumber == null) {
            throw new IllegalStateException("수기 행 번호 발급에 실패했습니다.");
        }
        return rowNumber;
    }

    public Map<String, Object> findRowMeta(long rowNumber) {
        List<Map<String, Object>> rows = martJdbc.queryForList(
                "SELECT origin, locked_at FROM overseas_marketing_sheet WHERE sheet_row_number = :rowNumber",
                new MapSqlParameterSource("rowNumber", rowNumber));
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public int updateRow(MapSqlParameterSource params) {
        return martJdbc.update(ROW_UPDATE_SQL, params);
    }

    /** 예약통계 저장값(시드+수동 수정) 조회. */
    public List<Map<String, Object>> findReservationStats(String from, String to) {
        return martJdbc.queryForList(RSV_STATS_SELECT_SQL, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }

    /** 예약통계 셀 수동 수정 — 자동 집계·시드보다 우선한다. */
    public void upsertReservationStat(String date, String groupKey, String metricKey, int value, String actor) {
        martJdbc.update(RSV_STATS_UPSERT_SQL, new MapSqlParameterSource()
                .addValue("date", date)
                .addValue("groupKey", groupKey)
                .addValue("metricKey", metricKey)
                .addValue("value", value)
                .addValue("actor", actor));
    }

    /** 예약통계 자동 집계 원천 행(접수리스트 전체). */
    public List<Map<String, Object>> findReservationStatsSourceRows() {
        return martJdbc.queryForList(RSV_STATS_SOURCE_SQL, Map.of());
    }

    /** CRM 파생값 스냅샷을 영속화한다 — 이후 조회는 MSSQL 병합을 건너뛴다. */
    public void saveCrmSnapshots(MapSqlParameterSource[] snapshots) {
        if (snapshots.length == 0) return;
        martJdbc.batchUpdate(
                "UPDATE overseas_marketing_sheet SET crm_snapshot = :snapshot, crm_refreshed_at = CURRENT_TIMESTAMP WHERE sheet_row_number = :rowNumber",
                snapshots);
    }

    /** 저장된 스냅샷 전체 무효화 — 다음 조회(또는 새로고침의 재적재)에서 CRM을 다시 읽는다. */
    public void clearCrmSnapshots() {
        martJdbc.getJdbcTemplate().execute(
                "UPDATE overseas_marketing_sheet SET crm_snapshot = NULL, crm_refreshed_at = NULL");
    }

    /** 새로 확정된 CRM 매칭을 영속화한다 — 이후 조회는 CRM 이름 검색을 건너뛴다. */
    public void saveMatches(MapSqlParameterSource[] matches) {
        if (matches.length == 0) return;
        martJdbc.batchUpdate(
                "UPDATE overseas_marketing_sheet SET customer_no = :customerNo, matched_at = CURRENT_TIMESTAMP,"
                        + " matched_by = :matchedBy, candidate_customer_no = NULL, candidate_reason = NULL"
                        + " WHERE sheet_row_number = :rowNumber",
                matches);
    }

    /** 확정하지 못한 전화·이메일 후보를 '확인필요' 상태로 보관한다. */
    public void saveCandidates(MapSqlParameterSource[] candidates) {
        if (candidates.length == 0) return;
        martJdbc.batchUpdate(
                "UPDATE overseas_marketing_sheet SET candidate_customer_no = :candidateNo, candidate_reason = :reason"
                        + " WHERE sheet_row_number = :rowNumber AND customer_no IS NULL",
                candidates);
    }

    /** CRM 고객번호 단건 조회 — 수동 매칭 팝업의 미리보기·검증용. */
    public List<Map<String, Object>> findCustomerByNo(String customerNo) {
        // CUST_NUM 고정 13자리 — RTRIM 없이 인덱스를 탄다(docs/db/tables/CUSTOM.md).
        return findCandidates("c.CUST_NUM IN (:values)", List.of(customerNo));
    }

    public int deleteManualRow(long rowNumber) {
        return martJdbc.update(
                "DELETE FROM overseas_marketing_sheet WHERE sheet_row_number = :rowNumber AND origin = 'manual' AND locked_at IS NULL",
                new MapSqlParameterSource("rowNumber", rowNumber));
    }

    public List<Map<String, Object>> findMonthly(int year) {
        return martJdbc.queryForList(SHEET_MONTHLY_SQL, yearParams(year));
    }

    public List<Map<String, Object>> findRevenue(int year) {
        return List.of();
    }

    public List<Map<String, Object>> findTopCountries(int year) {
        return List.of();
    }

    private MapSqlParameterSource yearParams(int year) {
        return new MapSqlParameterSource()
                .addValue("from", year + "-01-01")
                .addValue("to", year + "-12-31");
    }
}
