package com.bviit.analytics.consultation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 배치 하이브리드 브릿지 — Postgres primary 리스트에서 뽑은 chart_no 셋의 O 예약·수술 요약을 실시간 조회.
 *
 * 왜 이게 필요한가. list_reservation_all·list_surgery 는 배치 target range 로 잘려 담겨
 * 예약률·상담성공률 계산에 필요한 range 밖(특히 미래) 예약을 못 본다. 이 브릿지는
 * ConsultationMartJob 이 배치 실행 시점에 원천을 실시간 조회해 정확한 값을 얻게 한다.
 *
 * 다른 지표(예약 건수·외래수·중단사유)는 range 밖 데이터가 불필요해 이 브릿지를 쓰지 않는다.
 *
 * <p><b>소스 라우팅 (data-platform 프로파일 · 2026-09-30 Phase 2)</b>
 * <ul>
 *   <li>기본: CRM 직접연결 (statsJdbcTemplate) + sql/softcrm/consultation/*.sql</li>
 *   <li>data-platform 활성: 웨어하우스 (warehouseJdbcTemplate) + sql/warehouse/consultation/*.sql</li>
 * </ul>
 *
 * IN 절 파라미터 한계(SQL Server 2100) 를 피하려 chart_no 셋은 청크 단위로 조회한다.
 * Postgres 는 한계가 더 높지만 동일 청크 크기로 두 방언 모두 안전 커버.
 */
@Repository
@Profile("postgres-mart")
public class ConsultationRateBridgeRepository {

    private static final int CHUNK_SIZE = 1000;

    static final String O_RESERVATION_SUMMARY_MSSQL     = "sql/softcrm/consultation/select-o-reservation-summary-by-charts.sql";
    static final String O_RESERVATION_SUMMARY_WAREHOUSE = "sql/warehouse/consultation/select-o-reservation-summary-by-charts.sql";
    static final String OP_SUMMARY_MSSQL                = "sql/softcrm/consultation/select-op-summary-by-charts.sql";
    static final String OP_SUMMARY_WAREHOUSE            = "sql/warehouse/consultation/select-op-summary-by-charts.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String oReservationSummarySql;
    private final String opSummarySql;

    public ConsultationRateBridgeRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate statsJdbc,
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc,
            @Value("${data-platform.enabled:false}") boolean dataPlatformEnabled
    ) {
        this.jdbc = dataPlatformEnabled ? warehouseJdbc : statsJdbc;
        this.oReservationSummarySql = SqlLoader.load(dataPlatformEnabled ? O_RESERVATION_SUMMARY_WAREHOUSE : O_RESERVATION_SUMMARY_MSSQL);
        this.opSummarySql           = SqlLoader.load(dataPlatformEnabled ? OP_SUMMARY_WAREHOUSE            : OP_SUMMARY_MSSQL);
    }

    /** chart_no 별 O 예약 요약. 결과에 없는 chart_no 는 "O 예약 없음"으로 간주. */
    public Map<String, OReservationSummary> findOReservationSummary(Collection<String> chartNos) {
        Map<String, OReservationSummary> merged = new HashMap<>();
        for (List<String> chunk : chunk(chartNos)) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    oReservationSummarySql,
                    new MapSqlParameterSource("chartNos", chunk)
            );
            for (Map<String, Object> row : rows) {
                String chartNo = trimStr(row.get("chartNo"));
                merged.put(chartNo, new OReservationSummary(
                        parseDate(row.get("minOAny")),
                        parseDate(row.get("maxOAny")),
                        parseDate(row.get("minOCataract")),
                        parseDate(row.get("maxOCataract"))
                ));
            }
        }
        return merged;
    }

    /** chart_no 별 수술 요약. 결과에 없는 chart_no 는 "수술 없음"으로 간주. */
    public Map<String, OpSummary> findOpSummary(Collection<String> chartNos) {
        Map<String, OpSummary> merged = new HashMap<>();
        for (List<String> chunk : chunk(chartNos)) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    opSummarySql,
                    new MapSqlParameterSource("chartNos", chunk)
            );
            for (Map<String, Object> row : rows) {
                String chartNo = trimStr(row.get("chartNo"));
                merged.put(chartNo, new OpSummary(
                        parseDate(row.get("minOpDate")),
                        parseDate(row.get("maxOpDate"))
                ));
            }
        }
        return merged;
    }

    private static List<List<String>> chunk(Collection<String> src) {
        Set<String> dedup = new HashSet<>();
        for (String s : src) if (s != null && !s.isBlank()) dedup.add(s.trim());
        List<String> list = new java.util.ArrayList<>(dedup);
        List<List<String>> chunks = new java.util.ArrayList<>();
        for (int i = 0; i < list.size(); i += CHUNK_SIZE) {
            chunks.add(list.subList(i, Math.min(i + CHUNK_SIZE, list.size())));
        }
        return chunks;
    }

    private static String trimStr(Object v) { return v == null ? "" : v.toString().trim(); }

    private static LocalDate parseDate(Object v) {
        if (v == null) return null;
        String s = v.toString().trim();
        if (s.isEmpty()) return null;
        try {
            return LocalDate.parse(s.substring(0, Math.min(10, s.length())));
        } catch (Exception e) {
            return null;
        }
    }

    /** chart_no 별 O 예약 요약. 필드가 null 이면 해당 카테고리 예약이 없다는 뜻. */
    public record OReservationSummary(
            LocalDate minOAny,
            LocalDate maxOAny,
            LocalDate minOCataract,
            LocalDate maxOCataract
    ) {
        public boolean hasAnyO()            { return maxOAny != null; }
        public boolean hasAnyOCataract()    { return maxOCataract != null; }
        public boolean hasOOnOrAfter(LocalDate d)         { return maxOAny != null && !maxOAny.isBefore(d); }
        public boolean hasOCataractOnOrAfter(LocalDate d) { return maxOCataract != null && !maxOCataract.isBefore(d); }
    }

    /** chart_no 별 수술 요약. 필드가 null 이면 수술 없음. */
    public record OpSummary(LocalDate minOpDate, LocalDate maxOpDate) {
        public boolean hasAnyOp()                  { return maxOpDate != null; }
        public boolean hasOpOnOrAfter(LocalDate d) { return maxOpDate != null && !maxOpDate.isBefore(d); }
    }
}
