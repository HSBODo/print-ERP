package com.bviit.analytics.marketing.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.marketing.dto.OverseasMarketingReceptionQuery;
import com.bviit.analytics.marketing.util.OverseasCustomerKeys;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
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

/**
 * Google Sheet 로컬 캐시와 원본 CRM 직결 조회를 분리한 저장소.
 *
 * <p><b>소스 라우팅 (data-platform 프로파일 · 2026-10-07 QUERY_DIRECT #2)</b>
 * <ul>
 *   <li>기본: CRM 직접연결 (statsJdbcTemplate · MSSQL SOFTCRM).</li>
 *   <li>data-platform 활성: 웨어하우스 (warehouseJdbcTemplate · raw.raw_crm_*).</li>
 * </ul>
 *
 * <p>⚠️ customer-details.sql 는 raw.raw_crm_custom_history·raw_crm_lens·raw_crm_lens_cfg 3개를
 * 참조한다. 운영 전환(data-platform.enabled=true) 전에 3개 적재가 완료돼야 한다
 * (docs/data-platform/migration-strategy.md §11.7). 적재 전 활성화 시 relation 미존재로 실패.
 */
@Repository
@Profile("postgres-mart")
public class OverseasMarketingRepository {

    private static final String RECEPTIONS_SQL      = SqlLoader.load("sql/mart/marketing/receptions.sql");
    private static final String SYNC_INSERT_SQL     = SqlLoader.load("sql/mart/marketing/sync-insert.sql");
    private static final String MANUAL_INSERT_SQL   = SqlLoader.load("sql/mart/marketing/manual-insert.sql");
    private static final String ROW_UPDATE_SQL      = SqlLoader.load("sql/mart/marketing/row-update.sql");
    private static final String SHEET_MONTHLY_SQL   = SqlLoader.load("sql/mart/marketing/sheet-monthly.sql");
    private static final String RSV_STATS_SELECT_SQL = SqlLoader.load("sql/mart/marketing/reservation-stats-select.sql");
    private static final String RSV_STATS_UPSERT_SQL = SqlLoader.load("sql/mart/marketing/reservation-stats-upsert.sql");
    private static final String RSV_STATS_SOURCE_SQL = SqlLoader.load("sql/mart/marketing/reservation-stats-source.sql");

    // CRM 직결 SQL — statsJdbcTemplate / warehouseJdbcTemplate 둘 중 활성 소스로 로딩.
    static final String OUTPATIENT_SQL_MSSQL             = "sql/softcrm/marketing/outpatient-enrichment.sql";
    static final String OUTPATIENT_SQL_WAREHOUSE         = "sql/warehouse/marketing/outpatient-enrichment.sql";
    static final String PRICE_ITEM_COSTS_SQL_MSSQL       = "sql/softcrm/marketing/price-item-costs.sql";
    static final String PRICE_ITEM_COSTS_SQL_WAREHOUSE   = "sql/warehouse/marketing/price-item-costs.sql";
    static final String FALLBACK_COSTS_SQL_MSSQL         = "sql/softcrm/marketing/fallback-costs.sql";
    static final String FALLBACK_COSTS_SQL_WAREHOUSE     = "sql/warehouse/marketing/fallback-costs.sql";
    static final String CUSTOMER_CANDIDATES_SQL_MSSQL    = "sql/softcrm/marketing/customer-candidates.sql";
    static final String CUSTOMER_CANDIDATES_SQL_WAREHOUSE = "sql/warehouse/marketing/customer-candidates.sql";
    static final String CUSTOMER_DETAILS_SQL_MSSQL       = "sql/softcrm/marketing/customer-details.sql";
    static final String CUSTOMER_DETAILS_SQL_WAREHOUSE   = "sql/warehouse/marketing/customer-details.sql";
    static final String EXAM_DATE_CANDIDATES_SQL_MSSQL   = "sql/softcrm/marketing/exam-date-candidates.sql";
    static final String EXAM_DATE_CANDIDATES_SQL_WAREHOUSE = "sql/warehouse/marketing/exam-date-candidates.sql";
    static final String SURGERY_DATE_CANDIDATES_SQL_MSSQL     = "sql/softcrm/marketing/surgery-date-candidates.sql";
    static final String SURGERY_DATE_CANDIDATES_SQL_WAREHOUSE = "sql/warehouse/marketing/surgery-date-candidates.sql";
    static final String CUSTOMER_STREAM_SQL_MSSQL        = "sql/softcrm/marketing/customer-stream.sql";
    static final String CUSTOMER_STREAM_SQL_WAREHOUSE    = "sql/warehouse/marketing/customer-stream.sql";

    // jtds는 네트워크 타임아웃을 지원하지 않아 느린 쿼리가 요청을 무한정 붙잡을 수 있다.
    // 이 저장소의 CRM 조회에만 쿼리 타임아웃을 걸어 동기화가 hang 되지 않게 한다(다른 통계 조회에는 영향 없음).
    // data-platform 활성 시에도 보수적으로 동일 타임아웃 유지 — raw.raw_crm_custom 전수 스트림이 느릴 수 있음.
    private static final int CRM_QUERY_TIMEOUT_SECONDS = 120;

    private static final int CUSTOMER_STREAM_FETCH_SIZE = 2000;

    // MSSQL prepared statement 파라미터 한도(2,100)를 넘지 않도록 IN 절 값을 나눠 조회한다.
    // Postgres 는 32,767 로 더 넉넉하지만 동일 청크 유지(캐시 성능·네트워크 왕복 균형).
    private static final int IN_CLAUSE_CHUNK = 1000;

    private final NamedParameterJdbcTemplate martJdbc;
    private final NamedParameterJdbcTemplate crmJdbc;
    private final boolean dataPlatformEnabled;

    private final String outpatientSql;
    private final String priceItemCostsSql;
    private final String fallbackCostsSql;
    private final String customerCandidatesSql;
    private final String customerDetailsSql;
    private final String examDateCandidatesSql;
    private final String surgeryDateCandidatesSql;
    private final String customerStreamSql;

    public OverseasMarketingRepository(
            @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate martJdbc,
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate statsJdbc,
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc,
            @Value("${data-platform.enabled:false}") boolean dataPlatformEnabled
    ) {
        this.martJdbc = martJdbc;
        this.dataPlatformEnabled = dataPlatformEnabled;

        NamedParameterJdbcTemplate activeSource = dataPlatformEnabled ? warehouseJdbc : statsJdbc;
        JdbcTemplate timedTemplate = new JdbcTemplate(
                java.util.Objects.requireNonNull(activeSource.getJdbcTemplate().getDataSource()));
        timedTemplate.setQueryTimeout(CRM_QUERY_TIMEOUT_SECONDS);
        this.crmJdbc = new NamedParameterJdbcTemplate(timedTemplate);

        this.outpatientSql            = SqlLoader.load(dataPlatformEnabled ? OUTPATIENT_SQL_WAREHOUSE            : OUTPATIENT_SQL_MSSQL);
        this.priceItemCostsSql        = SqlLoader.load(dataPlatformEnabled ? PRICE_ITEM_COSTS_SQL_WAREHOUSE      : PRICE_ITEM_COSTS_SQL_MSSQL);
        this.fallbackCostsSql         = SqlLoader.load(dataPlatformEnabled ? FALLBACK_COSTS_SQL_WAREHOUSE        : FALLBACK_COSTS_SQL_MSSQL);
        this.customerCandidatesSql    = SqlLoader.load(dataPlatformEnabled ? CUSTOMER_CANDIDATES_SQL_WAREHOUSE   : CUSTOMER_CANDIDATES_SQL_MSSQL);
        this.customerDetailsSql       = SqlLoader.load(dataPlatformEnabled ? CUSTOMER_DETAILS_SQL_WAREHOUSE      : CUSTOMER_DETAILS_SQL_MSSQL);
        this.examDateCandidatesSql    = SqlLoader.load(dataPlatformEnabled ? EXAM_DATE_CANDIDATES_SQL_WAREHOUSE  : EXAM_DATE_CANDIDATES_SQL_MSSQL);
        this.surgeryDateCandidatesSql = SqlLoader.load(dataPlatformEnabled ? SURGERY_DATE_CANDIDATES_SQL_WAREHOUSE : SURGERY_DATE_CANDIDATES_SQL_MSSQL);
        this.customerStreamSql        = SqlLoader.load(dataPlatformEnabled ? CUSTOMER_STREAM_SQL_WAREHOUSE       : CUSTOMER_STREAM_SQL_MSSQL);
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
        // ⚠️ TRIM 좌변 — warehouse 경로에서만. MSSQL 2014 는 TRIM() 함수 미지원이라 분기.
        // raw_crm_custom.cust_name 저장 패딩 일관성 없음 ('이지은               ' len=17 vs '염준영' len=3).
        // 운영 전환 시 이름 매칭 miss 방지. docs/data-platform/varchar-padding-trim-audit.md §6.2 #13
        String predicate = dataPlatformEnabled
                ? "TRIM(c.CUST_NAME) IN (:values)"
                : "c.CUST_NAME IN (:values)";
        return findCandidates(predicate, names);
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
            raw.query(customerStreamSql, rs -> {
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

    public List<Map<String, Object>> findCustomerDetails(List<String> customerNos) {
        return chunkedQuery(customerDetailsSql, "customerNos", customerNos);
    }

    private List<Map<String, Object>> findCandidates(String predicate, List<String> values) {
        return chunkedQuery(customerCandidatesSql.formatted(predicate), "values", values);
    }

    /** 해당 날짜들에 검사예약이 있던 고객 — 날짜가 후보군을 좁혀 이름·생일 대조 매칭에 쓴다. */
    public List<Map<String, Object>> findExamDateCandidates(List<String> dates) {
        return chunkedDateQuery(examDateCandidatesSql, dates);
    }

    /** 해당 날짜들에 수술 기록이 있는 고객. */
    public List<Map<String, Object>> findSurgeryDateCandidates(List<String> dates) {
        return chunkedDateQuery(surgeryDateCandidatesSql, dates);
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
        return chunkedQuery(outpatientSql, "customerNos", customerNos);
    }

    public List<Map<String, Object>> findPriceItemCosts(List<String> customerNos) {
        return chunkedQuery(priceItemCostsSql, "customerNos", customerNos);
    }

    public List<Map<String, Object>> findFallbackCosts(List<String> customerNos) {
        return chunkedQuery(fallbackCostsSql, "customerNos", customerNos);
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
        // ⚠️ TRIM 좌변 — warehouse 경로에서만. MSSQL 2014 는 TRIM() 함수 미지원이라 분기.
        // warehouse raw_crm_custom.cust_num(varchar 13) 공백 패딩, 넘기는 customerNo 는 trimmed.
        // (MSSQL 경로는 char(13) padding-insensitive 비교라 TRIM 없이도 매칭 OK)
        // docs/data-platform/varchar-padding-trim-audit.md §6.2 #16
        String predicate = dataPlatformEnabled
                ? "TRIM(c.CUST_NUM) IN (:values)"
                : "c.CUST_NUM IN (:values)";
        return findCandidates(predicate, List.of(customerNo));
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
