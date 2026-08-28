package com.bviit.analytics.sms.service;

import com.bviit.analytics.common.exception.DataSourceUnavailableException;
import com.bviit.analytics.sms.config.SolapiProperties;
import com.bviit.analytics.sms.dto.SmsTemplateGroupInfo;
import com.solapi.sdk.SolapiClient;
import com.solapi.sdk.message.dto.response.MultipleDetailMessageSentResponse;
import com.solapi.sdk.message.exception.SolapiMessageNotReceivedException;
import com.solapi.sdk.message.model.Message;
import com.solapi.sdk.message.model.kakao.KakaoOption;
import com.solapi.sdk.message.service.DefaultMessageService;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * 솔라피 SDK 래퍼 — 발송 1건을 보내고 조회 대사용 키(messageId·groupId·타입·상태코드)를 돌려준다.
 *
 * API 키 미설정 환경(로컬 등)에서는 503(DataSourceUnavailableException)으로 응답한다 —
 * 홈페이지·아이리더 데이터소스 미설정과 같은 패턴(설정이 없으면 그 기능만 죽는다).
 */
@Slf4j
@Service
public class SolapiSendService {

    public static final String CHANNEL_ALIMTALK = "ALIMTALK";
    public static final String CHANNEL_SMS = "SMS";

    private final SolapiProperties props;
    private volatile DefaultMessageService messageService;

    public SolapiSendService(SolapiProperties props) {
        this.props = props;
    }

    @Getter
    @Builder
    public static class SendOutcome {
        private final boolean success;
        private final String messageType;      // 솔라피 실제 타입(SMS/LMS/ATA …)
        private final String solapiGroupId;    // G4V…
        private final String solapiMessageId;  // M4V…
        private final String statusCode;
        private final String failReason;
    }

    /** 대상 1명에게 템플릿 1종을 발송한다. 실패해도 예외를 던지지 않고 outcome 으로 돌려준다. */
    /**
     * 실제 발송. 문구는 <b>차수가 아니라 (차수 × 수술 그룹) 슬롯</b>이 갖는다 —
     * 같은 1차라도 라섹과 스마일의 안내 내용이 다르기 때문이다.
     */
    public SendOutcome send(String to, SmsTemplateGroupInfo slot, String channel,
                            Map<String, String> variables, boolean delayed) {
        // Dry-run 안전장치가 우선 — 실제 API 키가 채워져 있어도 발송 안 함.
        // 이력(sms_send_log)은 남지만 messageType=DRY_RUN, messageId=null 로 실제 발송과 구분된다.
        if (props.isDryRun()) {
            String preview = substitute(slot.textFor(delayed), variables);
            log.info("[DRY-RUN] SMS 미발송 (실제 API 호출 안 함) — to={}, channel={}, group={}, tier={}, delayed={}, preview={}",
                    mask(to), channel, slot.groupCode(), slot.offsetDays(), delayed,
                    preview.length() > 100 ? preview.substring(0, 100) + "…" : preview);
            return SendOutcome.builder()
                    .success(true)
                    .messageType("DRY_RUN")
                    .statusCode("DRY_RUN")
                    .build();
        }

        requireConfigured(slot, channel, delayed);

        Message message = new Message();
        message.setFrom(props.getFrom());
        message.setTo(to);

        if (CHANNEL_ALIMTALK.equals(channel)) {
            KakaoOption kakao = new KakaoOption();
            kakao.setPfId(props.getPfId());
            kakao.setTemplateId(slot.templateId());
            kakao.setVariables(new HashMap<>(variables));
            // 대체발송 허용(SDK 기본값). 명시해 두는 건 "끄지 않기로 정했다"는 뜻이다 —
            // 카카오 채널 미친구·차단으로 알림톡이 막히면 문자로라도 나가야 안내가 산다.
            kakao.setDisableSms(false);
            message.setKakaoOptions(kakao);

            /*
             * 알림톡 본문은 승인된 템플릿이 갖는다. 그런데 **대체발송이 쓸 본문은 message.text** 라,
             * 이걸 비워 두면 알림톡이 실패했을 때 보낼 내용이 없어 대체발송이 성립하지 않는다.
             * (2026-08-14 이전이 그 상태였다 — 알림톡 실패 = 그냥 미발송.)
             *
             * ⚠️ 그래서 문자 본문은 알림톡 승인 문구와 **같은 내용으로 유지해야 한다.**
             *    다르면 어떤 사람은 알림톡 문구를, 어떤 사람은 다른 문구를 받는다.
             */
            String fallback = substitute(slot.textFor(delayed), variables);
            if (!fallback.isBlank()) message.setText(fallback);
        } else {
            // 재조정된 대상에게는 경과 문장을 뺀 본문이 나간다(그래서 지연 건은 문자로만 보낸다).
            message.setText(substitute(slot.textFor(delayed), variables));
        }

        try {
            MultipleDetailMessageSentResponse response = messageService().send(message);
            String groupId = response.getGroupInfo() != null ? response.getGroupInfo().getGroupId() : null;
            String messageId = null;
            String statusCode = null;
            if (response.getMessageList() != null && !response.getMessageList().isEmpty()) {
                messageId = response.getMessageList().get(0).getMessageId();
                statusCode = response.getMessageList().get(0).getStatusCode();
            }
            return SendOutcome.builder()
                    .success(true)
                    .messageType(message.getType() != null ? message.getType().name() : null)
                    .solapiGroupId(groupId)
                    .solapiMessageId(messageId)
                    .statusCode(statusCode)
                    .build();
        } catch (SolapiMessageNotReceivedException e) {
            log.warn("솔라피 발송 실패(접수 거부): to={}, template={}, reason={}", mask(to), slot.groupCode(), e.getMessage());
            return failure(e.getMessage());
        } catch (Exception e) {
            log.warn("솔라피 발송 실패: to={}, template={}, reason={}", mask(to), slot.groupCode(), e.getMessage());
            return failure(e.getMessage());
        }
    }

    private SendOutcome failure(String reason) {
        String trimmed = reason == null ? "알 수 없는 오류" : reason;
        if (trimmed.length() > 490) trimmed = trimmed.substring(0, 490);
        return SendOutcome.builder().success(false).failReason(trimmed).build();
    }

    private void requireConfigured(SmsTemplateGroupInfo slot, String channel, boolean delayed) {
        if (!props.isConfigured()) {
            throw new DataSourceUnavailableException(
                    "솔라피 API 키가 설정되지 않았습니다. backend/.env 의 SOLAPI_API_KEY·SOLAPI_API_SECRET·SOLAPI_FROM 을 확인하세요.");
        }
        if (CHANNEL_ALIMTALK.equals(channel) && !slot.alimtalkReady()) {
            throw new DataSourceUnavailableException(
                    "알림톡 설정이 없습니다. SOLAPI_PFID 와 " + slot.groupLabel() + " 템플릿 ID 를 확인하세요.");
        }
        if (CHANNEL_SMS.equals(channel) && (delayed ? !slot.delayedReady() : !slot.smsReady())) {
            throw new DataSourceUnavailableException(
                    "문자 본문이 설정되지 않았습니다. 템플릿 " + slot.groupCode() + " 의 "
                            + (delayed ? "sms-text-delayed" : "sms-text") + " 를 확인하세요.");
        }
    }

    /** #{이름}·#{수술일} 등 치환. 알림톡은 솔라피가, 문자는 우리가 치환한다. */
    private static String substitute(String text, Map<String, String> variables) {
        String out = text;
        for (Map.Entry<String, String> entry : variables.entrySet()) {
            out = out.replace(entry.getKey(), entry.getValue() == null ? "" : entry.getValue());
        }
        return out;
    }

    /** 로그에 전화번호 전체를 남기지 않는다(개인정보). */
    private static String mask(String phone) {
        if (phone == null || phone.length() < 7) return "***";
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 2);
    }

    private DefaultMessageService messageService() {
        DefaultMessageService service = messageService;
        if (service == null) {
            synchronized (this) {
                if (messageService == null) {
                    messageService = SolapiClient.INSTANCE.createInstance(props.getApiKey(), props.getApiSecret());
                }
                service = messageService;
            }
        }
        return service;
    }
}
