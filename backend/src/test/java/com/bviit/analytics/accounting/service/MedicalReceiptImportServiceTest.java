package com.bviit.analytics.accounting.service;

import com.bviit.analytics.accounting.dto.MedicalMonthlyItem;
import com.bviit.analytics.accounting.repository.MedicalReceiptSourceRepository;
import com.bviit.analytics.batch.job.AccountingMartWriter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 진료 수납 적재 범위 규칙을 잠근다 — 달은 1일부터 다시 읽되 요청 범위 끝(to) 이후는 읽지 않고,
 * 삭제는 달 전체·삽입은 to 까지. (수동 실행에서 당일 미완 수납이 섞이지 않게 · 시력교정과 끝 날짜 동일)
 * 스프링 컨텍스트 없이 mock 2종.
 */
class MedicalReceiptImportServiceTest {

    private MedicalReceiptSourceRepository source;
    private AccountingMartWriter writer;
    private MedicalReceiptImportService importer;

    @BeforeEach
    void setUp() {
        source = mock(MedicalReceiptSourceRepository.class);
        writer = mock(AccountingMartWriter.class);
        importer = new MedicalReceiptImportService(source, writer);
        when(writer.replaceMedicalReceipts(any(), any(), anyList())).thenReturn(1);
        when(writer.upsertMedicalMonthly(anyList(), anyBoolean())).thenReturn(1);
    }

    @Test
    void 달_중간까지_요청하면_1일부터_to까지_읽고_삭제는_달_전체다() {
        LocalDate mid = LocalDate.of(2026, 7, 15);
        List<Map<String, Object>> rows = List.of(Map.of("receiptDate", "2026-07-01"));
        when(source.findReceipts(LocalDate.of(2026, 7, 1), mid)).thenReturn(rows);

        importer.importRange(mid, mid);

        verify(source).findMonthlyParts(LocalDate.of(2026, 7, 1), mid);
        verify(source).findReceipts(LocalDate.of(2026, 7, 1), mid);
        verify(source, never()).findReceipts(any(), eq(LocalDate.of(2026, 7, 31)));
        verify(writer).replaceMedicalReceipts(LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31), rows);
    }

    @Test
    void 두_달에_걸치면_앞달은_말일까지_뒷달은_to까지_읽는다() {
        LocalDate from = LocalDate.of(2026, 8, 20);
        LocalDate to = LocalDate.of(2026, 9, 14);

        importer.importRange(from, to);

        verify(source).findMonthlyParts(LocalDate.of(2026, 8, 1), to);
        verify(source).findReceipts(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));
        verify(source).findReceipts(LocalDate.of(2026, 9, 1), to);
        verify(writer).replaceMedicalReceipts(eq(LocalDate.of(2026, 8, 1)), eq(LocalDate.of(2026, 8, 31)), anyList());
        verify(writer).replaceMedicalReceipts(eq(LocalDate.of(2026, 9, 1)), eq(LocalDate.of(2026, 9, 30)), anyList());
    }

    @Test
    void 행_시작_이전_달은_집계만_rows_complete_false로_올린다() {
        importer.importRange(LocalDate.of(2025, 12, 15), LocalDate.of(2026, 1, 15));

        verify(source, never()).findReceipts(eq(LocalDate.of(2025, 12, 1)), any());
        verify(source).findReceipts(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 15));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<MedicalMonthlyItem>> items = ArgumentCaptor.forClass(List.class);
        ArgumentCaptor<Boolean> complete = ArgumentCaptor.forClass(Boolean.class);
        verify(writer, org.mockito.Mockito.times(2)).upsertMedicalMonthly(items.capture(), complete.capture());
        assertThat(items.getAllValues().get(0).get(0).month()).isEqualTo(12);
        assertThat(complete.getAllValues()).containsExactly(false, true);
    }
}
