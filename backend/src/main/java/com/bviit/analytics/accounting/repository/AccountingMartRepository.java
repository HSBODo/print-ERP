package com.bviit.analytics.accounting.repository;

import com.bviit.analytics.accounting.dto.AccountingStatus;
import com.bviit.analytics.accounting.dto.MedicalMonthlyPoint;
import com.bviit.analytics.accounting.dto.MedicalReceiptRow;
import com.bviit.analytics.accounting.dto.VisionMonthlyPoint;
import com.bviit.analytics.accounting.dto.VisionReceiptRow;
import com.bviit.analytics.common.util.SqlLoader;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 회계 마트 조회 — list_medical_receipt · mart_medical_receipt_monthly · list_vision_receipt. 화면용.
 */
@Repository
@Profile("postgres-mart")
public class AccountingMartRepository {

    private static final String SELECT_MEDICAL_SQL = SqlLoader.load("sql/mart/accounting/select-list-medical-receipt.sql");
    private static final String SELECT_MEDICAL_MONTHLY_SQL = SqlLoader.load("sql/mart/accounting/select-medical-receipt-monthly.sql");
    private static final String SELECT_MEDICAL_MONTHLY_FROM_LIST_SQL = SqlLoader.load("sql/mart/accounting/select-medical-receipt-monthly-from-list.sql");
    private static final String SELECT_VISION_SQL = SqlLoader.load("sql/mart/accounting/select-list-vision-receipt.sql");
    private static final String SELECT_VISION_MONTHLY_SQL = SqlLoader.load("sql/mart/accounting/select-vision-receipt-monthly.sql");
    private static final String SELECT_STATUS_SQL = SqlLoader.load("sql/mart/accounting/select-accounting-status.sql");

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final TypeReference<Map<String, Long>> ITEM_AMOUNTS = new TypeReference<>() { };

    private static final RowMapper<MedicalReceiptRow> MEDICAL_ROW = (rs, n) -> new MedicalReceiptRow(
            rs.getString("id"),
            rs.getString("receiptDate"),
            rs.getString("receiptType"),
            rs.getString("chartNo"),
            rs.getInt("serialNo"),
            rs.getString("patientName"),
            rs.getString("insuranceType"),
            rs.getString("doctor"),
            rs.getString("receiptStaff"),
            rs.getString("receiptTime"),
            rs.getString("room"),
            rs.getString("revenueType"),
            rs.getString("status"),
            rs.getBoolean("closed"),
            rs.getLong("hundredCopay"),
            rs.getLong("hundredUnpaid"),
            rs.getLong("salaryTotal"),
            rs.getLong("claimAmount"),
            rs.getLong("copay"),
            rs.getLong("nonCovered"),
            rs.getLong("totalCopay"),
            rs.getLong("welfareSupport"),
            rs.getLong("disabledSupport"),
            rs.getLong("supportAmount"),
            rs.getLong("healthLivingExpense"),
            rs.getLong("actualPaid"),
            rs.getLong("outstanding"),
            rs.getLong("discount"),
            rs.getString("discountReason"),
            rs.getLong("card"),
            rs.getLong("cash"),
            rs.getLong("transfer"),
            rs.getLong("refund"),
            rs.getLong("outstandingOccurred"),
            rs.getLong("outstandingRecovered"),
            rs.getLong("outstandingCard"),
            rs.getLong("outstandingCash"),
            rs.getLong("outstandingTransfer"),
            rs.getLong("refundOccurred"),
            rs.getLong("cashReceipt"));

    private static final RowMapper<VisionReceiptRow> VISION_ROW = (rs, n) -> new VisionReceiptRow(
            rs.getString("id"),
            rs.getString("receiptDate"),
            rs.getString("chartNo"),
            rs.getString("patientName"),
            rs.getString("customerGrade"),
            rs.getString("surgeryDate"),
            rs.getString("surgeon"),
            rs.getString("procedureRight"),
            rs.getString("procedureLeft"),
            rs.getString("counselor"),
            rs.getString("status"),
            rs.getString("paymentMethod"),
            rs.getString("cardCompany"),
            rs.getString("acquirer"),
            rs.getString("paymentMode"),
            rs.getString("category"),
            rs.getString("productName"),
            rs.getString("registeredBy"),
            rs.getString("registeredAt"),
            rs.getString("paymentMemo"),
            rs.getLong("amount"),
            rs.getLong("taxable"),
            rs.getLong("exempt"),
            parseItemAmounts(rs.getString("itemAmounts")));

    private final NamedParameterJdbcTemplate jdbc;

    public AccountingMartRepository(@Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<MedicalReceiptRow> findMedicalReceipts(String from, String to) {
        return jdbc.query(SELECT_MEDICAL_SQL, range(from, to), MEDICAL_ROW);
    }

    /** 월 전체 행 적재가 완료되지 않은 월의 집계 마트 — 구분 필터 없음. */
    public List<MedicalMonthlyPoint> findMedicalMonthly(List<Integer> years) {
        return jdbc.query(SELECT_MEDICAL_MONTHLY_SQL, new MapSqlParameterSource("years", years),
                (rs, n) -> new MedicalMonthlyPoint(rs.getInt("year"), rs.getInt("month"), rs.getInt("count"),
                        rs.getLong("net"), rs.getLong("claim"), rs.getLong("salaryTotal"), rs.getLong("nonCovered")));
    }

    /** 행 마트 재집계 — receiptType '' = 전체, cataract = 매출구분 입원·입원외. */
    public List<MedicalMonthlyPoint> findMedicalMonthlyFromList(List<Integer> years, String receiptType, boolean cataract) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("years", years)
                .addValue("receiptType", receiptType)
                .addValue("cataract", cataract);
        return jdbc.query(SELECT_MEDICAL_MONTHLY_FROM_LIST_SQL, params,
                (rs, n) -> new MedicalMonthlyPoint(rs.getInt("year"), rs.getInt("month"), rs.getInt("count"),
                        rs.getLong("net"), rs.getLong("claim"), rs.getLong("salaryTotal"), rs.getLong("nonCovered")));
    }

    public List<VisionReceiptRow> findVisionReceipts(String from, String to) {
        return jdbc.query(SELECT_VISION_SQL, range(from, to), VISION_ROW);
    }

    public List<VisionMonthlyPoint> findVisionMonthly(List<Integer> years) {
        return jdbc.query(SELECT_VISION_MONTHLY_SQL, new MapSqlParameterSource("years", years),
                (rs, n) -> new VisionMonthlyPoint(rs.getInt("year"), rs.getInt("month"), rs.getInt("count"),
                        rs.getLong("amount")));
    }

    public AccountingStatus findStatus() {
        return jdbc.queryForObject(SELECT_STATUS_SQL, new MapSqlParameterSource(), (rs, n) -> {
            int monthlyFromYear = rs.getInt("medicalMonthlyFromYear");
            Integer firstYear = rs.wasNull() ? null : monthlyFromYear;
            return new AccountingStatus(
                    rs.getString("medicalFrom"), rs.getString("medicalTo"), rs.getString("medicalLoadedAt"),
                    firstYear,
                    rs.getString("visionFrom"), rs.getString("visionTo"), rs.getString("visionLoadedAt"));
        });
    }

    private static MapSqlParameterSource range(String from, String to) {
        return new MapSqlParameterSource().addValue("from", from).addValue("to", to);
    }

    private static Map<String, Long> parseItemAmounts(String json) {
        if (json == null || json.isEmpty()) return Map.of();
        try {
            return JSON.readValue(json, ITEM_AMOUNTS);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("list_vision_receipt.item_amounts 파싱 실패", e);
        }
    }
}
