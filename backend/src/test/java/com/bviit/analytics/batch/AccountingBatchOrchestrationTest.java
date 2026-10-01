package com.bviit.analytics.batch;

import com.bviit.analytics.batch.dto.BatchRunLog;
import com.bviit.analytics.batch.job.AccountingMartJob;
import com.bviit.analytics.batch.job.SmsImportJob;
import com.bviit.analytics.batch.repository.BatchRunLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AccountingBatchOrchestrationTest {
    private BatchOrchestrator orchestrator;
    private AccountingMartJob accounting;
    private BatchRunLogRepository logs;
    private BatchSlackNotifier notifier;

    @BeforeEach
    void setUp() throws Exception {
        // 모든 도메인은 mock 처리: 스케줄러 검증 중 외부 DB·알림에 접근하지 않는다.
        var constructor = BatchOrchestrator.class.getConstructors()[0];
        Object[] dependencies = Arrays.stream(constructor.getParameterTypes()).map(t -> mock(t)).toArray();
        orchestrator = (BatchOrchestrator) constructor.newInstance(dependencies);
        accounting = (AccountingMartJob) ReflectionTestUtils.getField(orchestrator, "accountingMartJob");
        logs = (BatchRunLogRepository) ReflectionTestUtils.getField(orchestrator, "runLogRepository");
        notifier = (BatchSlackNotifier) ReflectionTestUtils.getField(orchestrator, "slackNotifier");
        ReflectionTestUtils.setField(orchestrator, "enabled", true);
        ReflectionTestUtils.setField(orchestrator, "minYear", 2026);
        when(logs.start(anyString(), any(), any(), any())).thenReturn(1L);
    }

    @Test
    void 진료_실패_플래그가_있으면_성공_이력과_성공_알림을_남기지_않는다() {
        Map<String, Integer> stats = Map.of("list_vision_receipt", 5, "list_medical_receipt_failed", 1);
        when(accounting.run(any(), any())).thenReturn(stats);
        orchestrator.runManual(LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31),
                Set.of(BatchOrchestrator.Domain.ACCOUNTING));
        verify(logs).fail(eq(1L), anyString(), eq(stats));
        verify(logs, never()).success(anyLong(), any());
        verify(notifier).notifyFailure(anyString(), any(), any(), any(), anyString(), any());
        verify(notifier, never()).notifySuccess(anyString(), any(), any(), any(), any(), any());
    }

    @Test
    void 월별_보정은_2023년부터_전월까지_회계_이력을_월단위로_재조회한다() {
        when(accounting.run(any(), any())).thenReturn(Map.of("list_vision_receipt", 2));
        orchestrator.runMonthlyReconcile();
        ArgumentCaptor<LocalDate> froms = ArgumentCaptor.forClass(LocalDate.class);
        ArgumentCaptor<LocalDate> tos = ArgumentCaptor.forClass(LocalDate.class);
        verify(accounting, atLeastOnce()).run(froms.capture(), tos.capture());
        YearMonth first = YearMonth.of(2023, 1);
        YearMonth last = YearMonth.now().minusMonths(1);
        assertThat(froms.getAllValues()).hasSize((int) first.until(last, java.time.temporal.ChronoUnit.MONTHS) + 1);
        for (YearMonth month = first; !month.isAfter(last); month = month.plusMonths(1)) {
            assertThat(froms.getAllValues()).contains(month.atDay(1));
            assertThat(tos.getAllValues()).contains(month.atEndOfMonth());
        }
        verify(logs).start("reconcile-accounting-history", BatchRunLog.RunType.MONTHLY_RECONCILE,
                first.atDay(1), last.atDay(1).minusDays(1));
    }

    @Test
    void 과거_월의_진료_실패가_후속_월의_성공에_가려지지_않는다() {
        when(accounting.run(any(), any())).thenReturn(Map.of("list_vision_receipt", 2));
        when(accounting.run(LocalDate.of(2023, 2, 1), LocalDate.of(2023, 2, 28)))
                .thenReturn(Map.of("list_vision_receipt", 2, "list_medical_receipt_failed", 1));
        orchestrator.runMonthlyReconcile();
        verify(logs).fail(eq(1L), anyString(), argThat(stats -> stats.get("list_medical_receipt_failed") == 1));
    }

    @Test
    void 배치가_꺼져있으면_과거_회계_재조회도_실행하지_않는다() {
        ReflectionTestUtils.setField(orchestrator, "enabled", false);
        orchestrator.runMonthlyReconcile();
        verifyNoInteractions(accounting, logs, notifier);
    }

    /**
     * 2026-10-01 사고 (docs/sms/incidents/2026-10-01-reconcile-bulk-dispatch.md) 재발 방지 회귀 테스트.
     *
     * <p>월배치가 뒤늦게 발견한 수술자의 과거-예정 T1·T2·T3 가 enqueue 시 clamp 되어 몇 분 안에
     * 몰려 발송되는 사고 재발 방지. 월배치는 SMS 를 건드리면 안 되고, 관리자 UI 의 "SMS 재적재"
     * 로 명시 실행만 가능. 이 테스트가 깨지면 MANUAL_ALL_DOMAINS 운영 정책이 깨진 것이라
     * 의도적으로 바꿀 때는 테스트와 함께 docs/sms/incidents/ 문서도 함께 갱신해야 한다.
     */
    @Test
    void 월별_보정은_SMS_도메인을_건드리지_않는다() {
        SmsImportJob sms = (SmsImportJob) ReflectionTestUtils.getField(orchestrator, "smsImportJob");
        when(accounting.run(any(), any())).thenReturn(Map.of("list_vision_receipt", 2));
        orchestrator.runMonthlyReconcile();
        verify(sms, never()).run(any(), any());
    }
}
