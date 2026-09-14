package com.bviit.analytics.marketing.service;

import com.bviit.analytics.marketing.dto.OverseasMarketingSyncResult;
import com.bviit.analytics.marketing.repository.OverseasMarketingRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Google Sheet 전체를 로컬 Postgres 캐시에 원자적으로 교체한다. */
@Service
@Profile("postgres-mart")
@ConditionalOnProperty(prefix = "overseas.google-sheets", name = "sync-enabled", havingValue = "true")
public class OverseasMarketingSyncService implements OverseasMarketingSyncer {

    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final Pattern MONTH_DAY = Pattern.compile("^(\\d{1,2})/(\\d{1,2})$");
    private static final Pattern FULL_DATE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}");

    private final OverseasMarketingSheetClient sheetClient;
    private final OverseasMarketingRepository repository;

    public OverseasMarketingSyncService(
            OverseasMarketingSheetClient sheetClient,
            OverseasMarketingRepository repository
    ) {
        this.sheetClient = sheetClient;
        this.repository = repository;
    }

    @Override
    @Transactional
    public synchronized OverseasMarketingSyncResult syncSheet() {
        long startedAt = System.currentTimeMillis();
        List<List<String>> sheetRows = sheetClient.readRows();
        List<MapSqlParameterSource> inserts = new ArrayList<>();
        String currentYear = String.valueOf(LocalDate.now(KOREA).getYear());
        int skipped = 0;

        for (int index = 1; index < sheetRows.size(); index++) {
            List<String> row = sheetRows.get(index);
            String yearCell = cell(row, 0);
            if (yearCell.matches("\\d{4}")) currentYear = yearCell;

            String contact = cell(row, 3);
            String email = cell(row, 4);
            String name = cell(row, 2);
            if (name.isBlank() && (!contact.isBlank() || !email.isBlank())) name = "(미입력)";
            if (name.isBlank()) {
                skipped++;
                continue;
            }
            inserts.add(parameters(row, index + 5, parseInquiryDate(cell(row, 1), currentYear), name));
        }

        repository.replaceSheetRows(inserts.toArray(MapSqlParameterSource[]::new));
        long elapsed = System.currentTimeMillis() - startedAt;
        String message = "시트 전체 동기화 완료: %d건 반영, 빈 행 %d건 제외".formatted(inserts.size(), skipped);
        return new OverseasMarketingSyncResult(inserts.size(), skipped, 0, 0, elapsed, message);
    }

    private MapSqlParameterSource parameters(List<String> row, int sheetRowNumber, String inquiryDate, String name) {
        return new MapSqlParameterSource()
                .addValue("sheetRowNumber", sheetRowNumber)
                .addValue("inquiryDate", inquiryDate)
                .addValue("name", name)
                .addValue("contact", nullableCell(row, 3))
                .addValue("email", nullableCell(row, 4))
                .addValue("gender", nullableCell(row, 5))
                .addValue("dob", nullableCell(row, 6))
                .addValue("nationality", normalizeNationality(nullableCell(row, 7)))
                .addValue("ethnicity", nullableCell(row, 8))
                .addValue("occupation", nullableCell(row, 9))
                .addValue("contactLens", nullableCell(row, 10))
                .addValue("medicalConditions", nullableCell(row, 11))
                .addValue("medicationAllergy", nullableCell(row, 12))
                .addValue("departureSchedule", nullableCell(row, 13))
                .addValue("examDate", nullableCell(row, 14))
                .addValue("surgeryDate", nullableCell(row, 15))
                .addValue("surgeryCost", nullableCell(row, 16))
                .addValue("channel", nullableCell(row, 17))
                .addValue("onlineChannel", nullableCell(row, 18))
                .addValue("remark", nullableCell(row, 19));
    }

    private String parseInquiryDate(String raw, String currentYear) {
        Matcher monthDay = MONTH_DAY.matcher(raw);
        if (monthDay.matches()) {
            return "%s-%02d-%02d".formatted(currentYear, Integer.parseInt(monthDay.group(1)), Integer.parseInt(monthDay.group(2)));
        }
        return FULL_DATE.matcher(raw).find() ? raw.substring(0, 10) : null;
    }

    private String normalizeNationality(String value) {
        return "배트남".equals(value) ? "베트남" : value;
    }

    private String nullableCell(List<String> row, int index) {
        String value = cell(row, index);
        return value.isBlank() ? null : value;
    }

    private String cell(List<String> row, int index) {
        return index < row.size() ? row.get(index).trim() : "";
    }
}
