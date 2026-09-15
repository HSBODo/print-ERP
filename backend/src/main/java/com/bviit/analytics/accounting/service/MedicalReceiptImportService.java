package com.bviit.analytics.accounting.service;

import com.bviit.analytics.accounting.dto.MedicalMonthlyItem;
import com.bviit.analytics.accounting.repository.MedicalReceiptSourceRepository;
import com.bviit.analytics.batch.job.AccountingMartWriter;
import lombok.RequiredArgsConstructor;
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
 * <p>범위가 걸친 달의 행과 월 집계를 함께 교체한다 — 각 달은 1일부터, 마지막 달은 to 까지만 읽는다.
 * 행 마트는 2026-01-01 이후만 싣는다. 빈 달도 0으로 upsert하여 원천에서 삭제된 금액이 남지 않게 한다.
 */
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

        // 달의 앞부분은 항상 1일부터 다시 읽고(월 단위 교체), 끝은 요청 범위 to 에서 자른다 —
        // 수동 실행에서 당일 진행 중인 수납이 섞이지 않게. 시력교정(요청 범위 그대로)과 끝 날짜가 같아진다.
        LocalDate monthFrom = YearMonth.from(from).atDay(1);
        Map<YearMonth, MedicalMonthlyItem> monthly = new LinkedHashMap<>();
        MedicalMonthlyFolder.fold(sourceRepository.findMonthlyParts(monthFrom, to))
                .forEach(m -> monthly.put(YearMonth.of(m.year(), m.month()), m));
        int rows = 0, months = 0;
        for (YearMonth month = YearMonth.from(from); !month.isAfter(YearMonth.from(to)); month = month.plusMonths(1)) {
            boolean rowsComplete = !month.atDay(1).isBefore(ROWS_FROM);
            if (rowsComplete) {
                LocalDate rowsTo = month.atEndOfMonth().isAfter(to) ? to : month.atEndOfMonth();
                // 삭제는 달 전체(to 이후에 남아 있던 행까지 걷어냄), 삽입은 to 까지.
                rows += writer.replaceMedicalReceipts(month.atDay(1), month.atEndOfMonth(),
                        sourceRepository.findReceipts(month.atDay(1), rowsTo));
            }
            MedicalMonthlyItem item = monthly.getOrDefault(month, emptyMonth(month));
            months += writer.upsertMedicalMonthly(List.of(item), rowsComplete);
        }
        stats.put("mart_medical_receipt_monthly", months);
        stats.put("list_medical_receipt", rows);
        return stats;
    }

    private static MedicalMonthlyItem emptyMonth(YearMonth month) {
        return new MedicalMonthlyItem(month.getYear(), month.getMonthValue(), 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
}
