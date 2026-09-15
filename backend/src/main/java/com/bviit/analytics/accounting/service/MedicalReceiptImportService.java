package com.bviit.analytics.accounting.service;

import com.bviit.analytics.accounting.dto.MedicalMonthlyItem;
import com.bviit.analytics.accounting.repository.MedicalReceiptSourceRepository;
import com.bviit.analytics.batch.job.AccountingMartWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 진료 수납(의사랑) 적재 — 링크드서버 의존 구간을 별도 트랜잭션으로 격리한다.
 *
 * <p>REQUIRES_NEW: 조회가 링크드서버(.240 IPLUS) 를 타므로 원격 장애 시 여기만 실패하고,
 * AccountingMartJob 의 시력교정(SOFTCRM 직결) 적재는 살린다 (EtcMartJob ↔ DreamlensLedgerImportService 와 같은 구조).
 *
 * <p>범위 = 수납일. 행 마트는 2026-01-01(_New 체계) 이후만 싣고, 월 집계는 from..to 가 걸친 달을 통째로 다시 계산해 upsert 한다
 * (2023 부터 조회 가능).
 */
@Slf4j
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class MedicalReceiptImportService {

    /** 원장 행은 _New 테이블 체계(백대백 항목) 가 시작된 2026-01-01 부터. */
    static final LocalDate ROWS_FROM = LocalDate.of(2026, 1, 1);

    private final MedicalReceiptSourceRepository sourceRepository;
    private final AccountingMartWriter writer;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Map<String, Integer> importRange(LocalDate from, LocalDate to) {
        Map<String, Integer> stats = new LinkedHashMap<>();

        LocalDate monthFrom = YearMonth.from(from).atDay(1);
        LocalDate monthTo = YearMonth.from(to).atEndOfMonth();
        List<MedicalMonthlyItem> monthly = MedicalMonthlyFolder.fold(sourceRepository.findMonthlyParts(monthFrom, monthTo));
        stats.put("mart_medical_receipt_monthly", writer.upsertMedicalMonthly(monthly));

        LocalDate rowsFrom = from.isBefore(ROWS_FROM) ? ROWS_FROM : from;
        if (!rowsFrom.isAfter(to)) {
            List<Map<String, Object>> rows = sourceRepository.findReceipts(rowsFrom, to);
            stats.put("list_medical_receipt", writer.replaceMedicalReceipts(rowsFrom, to, rows));
        } else {
            log.info("list_medical_receipt skip — range {}..{} is before {}", from, to, ROWS_FROM);
            stats.put("list_medical_receipt", 0);
        }
        return stats;
    }
}
