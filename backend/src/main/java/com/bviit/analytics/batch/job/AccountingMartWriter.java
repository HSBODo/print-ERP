package com.bviit.analytics.batch.job;

import com.bviit.analytics.accounting.dto.MedicalMonthlyItem;
import com.bviit.analytics.common.util.SqlLoader;
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
 * 회계 도메인 마트 write 컴포넌트.
 *
 * - list_medical_receipt · list_vision_receipt: 수납일 범위 delete + insert (원천 정정·취소 흡수)
 * - mart_medical_receipt_monthly: upsert (ON CONFLICT DO UPDATE)
 *
 * 트랜잭션 경계는 메서드 단위. 잡이 여러 write 를 묶고 싶으면 상위에서 감싼다.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class AccountingMartWriter {

    private static final String DELETE_MEDICAL_RANGE_SQL = SqlLoader.load("sql/mart/accounting/delete-list-medical-receipt-range.sql");
    private static final String INSERT_MEDICAL_SQL = SqlLoader.load("sql/mart/accounting/insert-list-medical-receipt.sql");
    private static final String UPSERT_MEDICAL_MONTHLY_SQL = SqlLoader.load("sql/mart/accounting/upsert-medical-receipt-monthly.sql");
    private static final String DELETE_VISION_RANGE_SQL = SqlLoader.load("sql/mart/accounting/delete-list-vision-receipt-range.sql");
    private static final String INSERT_VISION_SQL = SqlLoader.load("sql/mart/accounting/insert-list-vision-receipt.sql");

    private static final int BATCH_SIZE = 1000;

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    /** 의사랑 원장 행(camelCase 키) — 문자열은 trim, 숫자는 long 으로 정규화. row_seq 는 이 배치 안의 순번. */
    @Transactional
    public int replaceMedicalReceipts(LocalDate from, LocalDate to, List<Map<String, Object>> rows) {
        int deleted = jdbc.update(DELETE_MEDICAL_RANGE_SQL, rangeParams(from, to));
        int inserted = 0;
        for (int start = 0; start < rows.size(); start += BATCH_SIZE) {
            List<Map<String, Object>> chunk = rows.subList(start, Math.min(start + BATCH_SIZE, rows.size()));
            SqlParameterSource[] batch = new SqlParameterSource[chunk.size()];
            for (int i = 0; i < chunk.size(); i++) {
                batch[i] = toMedicalParams(chunk.get(i), start + i + 1);
            }
            inserted += sum(jdbc.batchUpdate(INSERT_MEDICAL_SQL, batch));
        }
        log.info("list_medical_receipt deleted={} inserted={}", deleted, inserted);
        return inserted;
    }

    @Transactional
    public int upsertMedicalMonthly(List<MedicalMonthlyItem> items, boolean rowsComplete) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(m -> toMonthlyParams(m, rowsComplete))
                .toArray(SqlParameterSource[]::new);
        int total = sum(jdbc.batchUpdate(UPSERT_MEDICAL_MONTHLY_SQL, batch));
        log.info("mart_medical_receipt_monthly upserted rows={}", total);
        return total;
    }

    /** 시력교정 행 (VisionReceiptAssembler 출력 · insert 파라미터 키와 1:1). */
    @Transactional
    public int replaceVisionReceipts(LocalDate from, LocalDate to, List<Map<String, Object>> rows) {
        int deleted = jdbc.update(DELETE_VISION_RANGE_SQL, rangeParams(from, to));
        int inserted = 0;
        for (int start = 0; start < rows.size(); start += BATCH_SIZE) {
            List<Map<String, Object>> chunk = rows.subList(start, Math.min(start + BATCH_SIZE, rows.size()));
            SqlParameterSource[] batch = chunk.stream()
                    .map(r -> new MapSqlParameterSource(r))
                    .toArray(SqlParameterSource[]::new);
            inserted += sum(jdbc.batchUpdate(INSERT_VISION_SQL, batch));
        }
        log.info("list_vision_receipt deleted={} inserted={}", deleted, inserted);
        return inserted;
    }

    private static final String[] MEDICAL_TEXT_KEYS = {
            "receiptDate", "receiptType", "chartNo", "patientName", "insuranceType", "doctor", "receiptStaff",
            "receiptTime", "room", "revenueType", "discountReason"
    };

    private static final String[] MEDICAL_NUMBER_KEYS = {
            "serialNo", "status", "closed",
            "hundredCopay", "hundredUnpaid", "salaryTotal", "claimAmount", "copay", "nonCovered", "totalCopay",
            "welfareSupport", "disabledSupport", "supportAmount", "healthLivingExpense",
            "actualPaid", "outstanding", "discount", "card", "cash", "transfer",
            "refund", "outstandingOccurred", "outstandingRecovered",
            "outstandingCard", "outstandingCash", "outstandingTransfer", "refundOccurred", "cashReceipt"
    };

    private static SqlParameterSource toMedicalParams(Map<String, Object> row, int rowSeq) {
        MapSqlParameterSource p = new MapSqlParameterSource();
        for (String k : MEDICAL_TEXT_KEYS) {
            Object v = row.get(k);
            // 의사랑 char 컬럼은 오른쪽 공백이 붙어 온다 — trim 필수.
            p.addValue(k, v == null ? "" : v.toString().trim());
        }
        for (String k : MEDICAL_NUMBER_KEYS) {
            p.addValue(k, toLong(row.get(k)));
        }
        p.addValue("rowSeq", rowSeq);
        return p;
    }

    private static SqlParameterSource toMonthlyParams(MedicalMonthlyItem m, boolean rowsComplete) {
        return new MapSqlParameterSource()
                .addValue("yr", m.year())
                .addValue("rowsComplete", rowsComplete)
                .addValue("mo", m.month())
                .addValue("receiptCount", m.count())
                .addValue("copayDue", m.copayDue())
                .addValue("claimAmount", m.claimAmount())
                .addValue("salaryTotal", m.salaryTotal())
                .addValue("nonCovered", m.nonCovered())
                .addValue("discount", m.discount())
                .addValue("outstandingRecovered", m.outstandingRecovered())
                .addValue("refund", m.refund())
                .addValue("outstandingNew", m.outstandingNew())
                .addValue("refundOccurred", m.refundOccurred())
                .addValue("healthLiving", m.healthLiving())
                .addValue("net", m.net());
    }

    private static MapSqlParameterSource rangeParams(LocalDate from, LocalDate to) {
        return new MapSqlParameterSource()
                .addValue("from", from, Types.DATE)
                .addValue("to", to, Types.DATE);
    }

    /** warehouse(Postgres) BIGINT/NUMERIC 합계를 어느 수치형이든 원 단위 long 으로 정규화. */
    static long toLong(Object v) {
        if (v == null) return 0L;
        if (v instanceof Number n) return Math.round(n.doubleValue());
        String s = v.toString().trim();
        if (s.isEmpty()) return 0L;
        return Math.round(Double.parseDouble(s));
    }

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
