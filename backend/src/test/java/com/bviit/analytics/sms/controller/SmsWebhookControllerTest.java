package com.bviit.analytics.sms.controller;

import com.bviit.analytics.sms.config.SolapiProperties;
import com.bviit.analytics.sms.dto.SolapiMessageReportEvent;
import com.bviit.analytics.sms.service.SolapiWebhookService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;

/**
 * 웹훅 컨트롤러의 <b>인증 대체</b> 로직 — 서명 검증과 이벤트 분기가 어긋나면
 * 아무나 발송 상태를 조작하거나(서명 미검증), 확장 이벤트에서 500 이 튀어(웹훅 자동 비활성) 위험하다.
 */
class SmsWebhookControllerTest {

    // 솔라피가 payload 에 원본을 그대로 실어 보내므로 헤더값 = vault 값.
    private static final String SECRET = "05fe836063a6f595f3be7f368e7694ead81c21ec";
    private static final String CORRECT_SIGNATURE = SECRET;
    private static final List<SolapiMessageReportEvent> ANY_EVENTS = List.of(
            new SolapiMessageReportEvent("MSG-1", null, "ATA", null, null,
                    "4000", null, null, null, "2026-09-01T10:00:00+09:00", null));

    @Test
    void 시크릿_미설정이면_서명을_검증하지_않고_서비스를_호출한다() {
        SolapiProperties props = mock(SolapiProperties.class);
        when(props.isWebhookSecretConfigured()).thenReturn(false);
        SolapiWebhookService service = mock(SolapiWebhookService.class);
        SmsWebhookController controller = new SmsWebhookController(props, service);

        ResponseEntity<Void> response = controller.receive("SINGLE-REPORT", null, ANY_EVENTS);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(service).applyMessageReports(ANY_EVENTS);
    }

    @Test
    void 시크릿_설정_됐는데_헤더가_없으면_401_로_거부한다() {
        SolapiProperties props = configuredWebhook();
        SolapiWebhookService service = mock(SolapiWebhookService.class);
        SmsWebhookController controller = new SmsWebhookController(props, service);

        ResponseEntity<Void> response = controller.receive("SINGLE-REPORT", null, ANY_EVENTS);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(service, never()).applyMessageReports(any());
    }

    @Test
    void 잘못된_서명은_401_로_거부한다() {
        SolapiProperties props = configuredWebhook();
        SolapiWebhookService service = mock(SolapiWebhookService.class);
        SmsWebhookController controller = new SmsWebhookController(props, service);

        ResponseEntity<Void> response = controller.receive("SINGLE-REPORT", "deadbeef", ANY_EVENTS);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(service, never()).applyMessageReports(any());
    }

    @Test
    void 정상_서명이면_서비스를_호출하고_200_을_반환한다() {
        SolapiProperties props = configuredWebhook();
        SolapiWebhookService service = mock(SolapiWebhookService.class);
        SmsWebhookController controller = new SmsWebhookController(props, service);

        ResponseEntity<Void> response = controller.receive("SINGLE-REPORT", CORRECT_SIGNATURE, ANY_EVENTS);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(service).applyMessageReports(ANY_EVENTS);
    }

    @Test
    void SINGLE_REPORT_이외_이벤트는_처리하지_않고_200_을_반환한다() {
        SolapiProperties props = configuredWebhook();
        SolapiWebhookService service = mock(SolapiWebhookService.class);
        SmsWebhookController controller = new SmsWebhookController(props, service);

        ResponseEntity<Void> response = controller.receive("GROUP-REPORT", CORRECT_SIGNATURE, ANY_EVENTS);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(service, never()).applyMessageReports(any());
    }

    @Test
    void 서비스에서_예외가_나도_200_으로_돌려_웹훅_재시도를_유발하지_않는다() {
        SolapiProperties props = configuredWebhook();
        SolapiWebhookService service = mock(SolapiWebhookService.class);
        doThrow(new RuntimeException("DB down")).when(service).applyMessageReports(any());
        SmsWebhookController controller = new SmsWebhookController(props, service);

        ResponseEntity<Void> response = controller.receive("SINGLE-REPORT", CORRECT_SIGNATURE, ANY_EVENTS);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private static SolapiProperties configuredWebhook() {
        SolapiProperties props = mock(SolapiProperties.class);
        when(props.isWebhookSecretConfigured()).thenReturn(true);
        when(props.getWebhookSecret()).thenReturn(SECRET);
        return props;
    }
}
