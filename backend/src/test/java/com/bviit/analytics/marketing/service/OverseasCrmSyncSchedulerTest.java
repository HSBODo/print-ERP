package com.bviit.analytics.marketing.service;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 해외마케팅 CRM 매칭 스케줄러 트리거 규칙을 못 박는다.
 *
 * 왜 잠가두나 — 이 스케줄러가 조용히 안 도는 상태가 되면 (a) 신규 접수가 계속 review/received
 * 로 남거나 (b) 사람이 안 봤을 때 실패한 잡을 인지하지 못한다. 트리거 자체와 재진입 안전성을
 * 여기서 지킨다. (조건부 빈 로딩·cron 파싱은 스프링이 담당.)
 */
class OverseasCrmSyncSchedulerTest {

    @Test
    void 스케줄_트리거가_syncCrm을_한번_호출한다() {
        OverseasMarketingReader reader = mock(OverseasMarketingReader.class);
        when(reader.syncCrm()).thenReturn(Map.of("state", "running"));
        OverseasCrmSyncScheduler scheduler = new OverseasCrmSyncScheduler(reader);

        scheduler.runScheduledCrmSync();

        verify(reader).syncCrm();
    }

    @Test
    void 이미_실행중이어도_예외없이_현재_상태를_로깅한다() {
        // syncCrm() 이 단일 실행 락 때문에 running 상태 그대로 반환해도 스케줄러는 예외 없이 종료.
        OverseasMarketingReader reader = mock(OverseasMarketingReader.class);
        when(reader.syncCrm()).thenReturn(Map.of("state", "running", "phase", "CRM 매칭"));
        OverseasCrmSyncScheduler scheduler = new OverseasCrmSyncScheduler(reader);

        scheduler.runScheduledCrmSync();  // 예외 던지지 않으면 통과

        verify(reader).syncCrm();
    }

    @Test
    void 잡_시작_반환값이_error여도_스케줄러는_예외로_전파하지_않는다() {
        // sync-crm 잡은 자체 try-catch 로 error 상태를 저장하고 정상 종료한다. 스케줄러는 그 상태를
        // 로깅만 하고 다음 실행에 영향 없게 마무리한다(다음 새벽 3시에 재시도).
        OverseasMarketingReader reader = mock(OverseasMarketingReader.class);
        when(reader.syncCrm()).thenReturn(Map.of("state", "error", "message", "MSSQL 연결 실패"));
        OverseasCrmSyncScheduler scheduler = new OverseasCrmSyncScheduler(reader);

        scheduler.runScheduledCrmSync();

        // syncCrm 이 호출됐고 예외 없이 반환되면 OK. 실제 error 감지는 Slack 로그 알림(BatchSlackNotifier
        // 대신 syncCrm 내부 log.error) 이 담당.
        verify(reader).syncCrm();
    }

    @Test
    void reader가_예외를_던지면_스케줄러도_전파한다() {
        // 스프링 스케줄러가 잡은 예외는 다음 스케줄에는 영향 없지만 로그로 기록된다.
        // 방어적 try-catch 를 두면 문제가 조용히 묻힐 수 있어 원시 예외 그대로 전파를 유지.
        OverseasMarketingReader reader = mock(OverseasMarketingReader.class);
        when(reader.syncCrm()).thenThrow(new IllegalStateException("의도된 실패"));
        OverseasCrmSyncScheduler scheduler = new OverseasCrmSyncScheduler(reader);

        assertThat(catchThrowable(() -> scheduler.runScheduledCrmSync()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("의도된 실패");
    }

    private static Throwable catchThrowable(Runnable action) {
        try { action.run(); return null; }
        catch (Throwable t) { return t; }
    }
}
