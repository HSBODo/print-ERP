package com.bviit.analytics.sms.service;

import com.bviit.analytics.sms.config.SolapiProperties;
import com.bviit.analytics.sms.dto.SmsTemplateGroupInfo;
import com.solapi.sdk.message.dto.response.MultipleDetailMessageSentResponse;
import com.solapi.sdk.message.dto.response.kakao.KakaoAlimtalkTemplateResponse;
import com.solapi.sdk.message.model.Message;
import com.solapi.sdk.message.service.DefaultMessageService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SolapiSendServiceTest {

    @Test
    void 알림톡은_발송_직전_조회한_솔라피_템플릿_본문을_치환해_보낸다() throws Exception {
        SolapiProperties props = mock(SolapiProperties.class);
        when(props.isDryRun()).thenReturn(false);
        when(props.isConfigured()).thenReturn(true);
        when(props.getFrom()).thenReturn("01012345678");
        when(props.getPfId()).thenReturn("PF123");

        DefaultMessageService messageService = mock(DefaultMessageService.class);
        KakaoAlimtalkTemplateResponse template = new KakaoAlimtalkTemplateResponse();
        template.setContent("#{name}님, 솔라피 승인 템플릿 본문입니다.");
        when(messageService.getKakaoAlimtalkTemplate("TPL_SMILE_1")).thenReturn(template);
        when(messageService.send(any(Message.class))).thenReturn(new MultipleDetailMessageSentResponse());

        SolapiSendService service = new SolapiSendService(props);
        ReflectionTestUtils.setField(service, "messageService", messageService);

        SmsTemplateGroupInfo slot = new SmsTemplateGroupInfo(
                "SMILE", "스마일수술", List.of("smile"), 1,
                "TPL_SMILE_1", "#{name}님, .env 문자 본문입니다.", "",
                true, true, false);

        SolapiSendService.SendOutcome outcome = service.send(
                "01080690814", slot, SolapiSendService.CHANNEL_ALIMTALK,
                Map.of("#{name}", "홍길동"), false);

        ArgumentCaptor<Message> message = ArgumentCaptor.forClass(Message.class);
        verify(messageService).send(message.capture());

        assertThat(outcome.isSuccess()).isTrue();
        assertThat(message.getValue().getText()).isEqualTo("홍길동님, 솔라피 승인 템플릿 본문입니다.");
        assertThat(message.getValue().getKakaoOptions().getTemplateId()).isEqualTo("TPL_SMILE_1");
    }
}
