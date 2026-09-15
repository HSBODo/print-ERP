package com.bviit.analytics.batch.job;

import com.bviit.analytics.accounting.repository.VisionReceiptSourceRepository;
import com.bviit.analytics.accounting.service.MedicalReceiptImportService;
import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 회계 배치 잡의 격리 규칙을 잠근다 — 의사랑(링크드서버) 적재가 실패해도 시력교정 적재와 성공 로그는 남는다.
 * 스프링 컨텍스트 없이 mock 4종.
 */
class AccountingMartJobTest {

    private VisionReceiptSourceRepository visionSource;
    private AccountingMartWriter writer;
    private MedicalReceiptImportService medicalImport;
    private BatchSuccessLogRepository successLog;
    private AccountingMartJob job;

    private static final LocalDate FROM = LocalDate.of(2026, 7, 1);
    private static final LocalDate TO = LocalDate.of(2026, 7, 31);

    @BeforeEach
    void setUp() {
        visionSource = mock(VisionReceiptSourceRepository.class);
        writer = mock(AccountingMartWriter.class);
        medicalImport = mock(MedicalReceiptImportService.class);
        successLog = mock(BatchSuccessLogRepository.class);
        job = new AccountingMartJob(visionSource, writer, medicalImport, successLog);

        Map<String, Object> pay = new HashMap<>();
        pay.put("custNum", "C1"); pay.put("seq", 1); pay.put("subSeq", 1);
        pay.put("receiptDate", "2026-07-01"); pay.put("amount", 100_000L); pay.put("cancelYn", "");
        when(visionSource.findPayments(FROM, TO)).thenReturn(List.of(pay));
        when(visionSource.findItemDetails(FROM, TO)).thenReturn(List.of());
        when(visionSource.findItemFallbacks(FROM, TO)).thenReturn(List.of());
        when(visionSource.findOperations(FROM, TO)).thenReturn(List.of());
        when(writer.replaceVisionReceipts(eq(FROM), eq(TO), anyList())).thenReturn(1);
    }

    @Test
    void 두_원천을_모두_적재하고_성공_로그를_남긴다() {
        when(medicalImport.importRange(FROM, TO)).thenReturn(Map.of("list_medical_receipt", 5, "mart_medical_receipt_monthly", 1));

        Map<String, Integer> stats = job.run(FROM, TO);

        assertThat(stats).containsEntry("list_vision_receipt", 1)
                .containsEntry("list_medical_receipt", 5)
                .containsEntry("mart_medical_receipt_monthly", 1)
                .doesNotContainKey("list_medical_receipt_failed");
        verify(successLog).upsert(eq("accounting"), eq(TO));
    }

    @Test
    void 의사랑_적재가_실패해도_시력교정_적재와_성공_로그는_유지되고_실패를_표시한다() {
        when(medicalImport.importRange(any(), any())).thenThrow(new IllegalStateException("linked server down"));

        Map<String, Integer> stats = job.run(FROM, TO);

        assertThat(stats).containsEntry("list_vision_receipt", 1)
                .containsEntry("list_medical_receipt_failed", 1);
        verify(writer).replaceVisionReceipts(eq(FROM), eq(TO), anyList());
        verify(successLog).upsert(eq("accounting"), eq(TO));
    }
}
