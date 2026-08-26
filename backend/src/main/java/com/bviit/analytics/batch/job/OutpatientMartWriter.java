package com.bviit.analytics.batch.job;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Types;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 외래 도메인 마트 write 컴포넌트.
 *
 * - mart_outpatient_count_monthly (upsert). outpatient_count/total은 null 저장 가능
 *   (서비스가 2026 미확인 월은 null로 반환 → 마트에도 그대로 저장).
 * - list_outpatient (delete+insert). 예약일(reserve_date) 범위의 기존 행을 지우고 새로 삽입.
 *   사후 취소·수정도 자연스럽게 반영됨.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OutpatientMartWriter {

    private static final String UPSERT_SQL = SqlLoader.load("sql/mart/upsert-outpatient-count-monthly.sql");
    private static final String DELETE_LIST_OUTPATIENT_RANGE_SQL = SqlLoader.load("sql/mart/delete-list-outpatient-range.sql");
    private static final String INSERT_LIST_OUTPATIENT_SQL = SqlLoader.load("sql/mart/insert-list-outpatient.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    @Transactional
    public int upsertMonthly(List<OutpatientCountMonthlyItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(OutpatientMartWriter::toParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_SQL, batch);
        int total = sum(updated);
        log.info("mart_outpatient_count_monthly upserted rows={}", total);
        return total;
    }

    /**
     * 외래수 명단은 delete+insert. RESERVE_DATE 범위의 기존 행을 지우고 새로 삽입.
     */
    @Transactional
    public int replaceListOutpatient(LocalDate from, LocalDate to, List<Map<String, Object>> rows) {
        int deleted = jdbc.update(
                DELETE_LIST_OUTPATIENT_RANGE_SQL,
                new MapSqlParameterSource()
                        .addValue("from", from, Types.DATE)
                        .addValue("to", to, Types.DATE)
        );
        if (rows.isEmpty()) {
            log.info("list_outpatient deleted={} inserted=0 (empty)", deleted);
            return 0;
        }
        SqlParameterSource[] batch = rows.stream()
                .map(OutpatientMartWriter::toListParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(INSERT_LIST_OUTPATIENT_SQL, batch);
        int inserted = sum(updated);
        log.info("list_outpatient deleted={} inserted={}", deleted, inserted);
        return inserted;
    }

    private static SqlParameterSource toParams(OutpatientCountMonthlyItem m) {
        return new MapSqlParameterSource()
                .addValue("yr", m.getYear())
                .addValue("mo", m.getMonth())
                .addValue("outpatientCount", m.getOutpatientCount(), Types.INTEGER)
                .addValue("total", m.getTotal(), Types.INTEGER);
    }

    /**
     * select-outpatient-list.sql의 List&lt;Map&gt; 결과(camelCase alias)를 파라미터로 매핑.
     * CRM 원본에 whitespace-only 값이 섞여 있어 trim 필수(exam/surgery/reservation과 동일).
     */
    private static SqlParameterSource toListParams(Map<String, Object> row) {
        MapSqlParameterSource p = new MapSqlParameterSource();
        for (String k : LIST_KEYS) {
            Object v = row.get(k);
            p.addValue(k, v == null ? "" : v.toString().trim());
        }
        return p;
    }

    private static final String[] LIST_KEYS = new String[]{
            "reserveNum", "reserveDate", "reserveTime", "endTime",
            "state", "stateCode",
            "reserveType", "reserveJinryoCode",
            "patientType", "oldFlag", "todayFlag", "happyCall",
            "chartNo", "name", "nameEng",
            "grade", "birth", "lunar",
            "phone1", "phone2", "email",
            "zip", "addr1", "addr2",
            "doctor", "counselor", "registeredBy",
            "comment", "route", "section",
            "motiveL", "motiveM", "motiveS", "motiveMemo",
            "job", "lastVisit", "insurance", "nationality", "memo"
    };

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
