package com.bviit.analytics.sms.service;

import com.bviit.analytics.common.exception.DataSourceUnavailableException;
import com.bviit.analytics.sms.config.SolapiProperties;
import com.bviit.analytics.sms.dto.SmsTemplateGroupInfo;
import com.solapi.sdk.SolapiClient;
import com.solapi.sdk.message.dto.request.SendRequestConfig;
import com.solapi.sdk.message.dto.response.MultipleDetailMessageSentResponse;
import com.solapi.sdk.message.dto.response.kakao.KakaoAlimtalkTemplateResponse;
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
        /**
         * dry-run 로그만 남긴 케이스인지 — 실제 솔라피 API 호출이 없었다는 뜻.
         * 상위(SmsDispatchJob)가 이걸 보고 큐 상태를 RECEIVED 가 아니라 DONE 으로 곧바로 굳힌다.
         * 웹훅이 절대 오지 않는 흐름이라 RECEIVED 에 두면 영원히 완결되지 않는다.
         * override-to 로 실 API 호출된 케이스는 웹훅이 정상적으로 오므로 여기서 false.
         */
        private final boolean dryRun;
    }

    /** 대상 1명에게 템플릿 1종을 발송한다. 실패해도 예외를 던지지 않고 outcome 으로 돌려준다. */
    /**
     * 실제 발송. 문구는 <b>차수가 아니라 (차수 × 수술 그룹) 슬롯</b>이 갖는다 —
     * 같은 1차라도 라섹과 스마일의 안내 내용이 다르기 때문이다.
     */
    public SendOutcome send(String to, SmsTemplateGroupInfo slot, String channel,
                            Map<String, String> variables, boolean delayed) {
        // Dry-run 안전장치가 최상위 스위치.
        //  - dry-run=true + override 비어 있음: API 미호출, 로그만 남김 (기존 동작).
        //  - dry-run=true + override 지정: 실 API 호출하되 수신자만 override 로 강제 (실 흐름 검증).
        //  - dry-run=false: 원 수신자로 실 발송. override 는 무시 (운영에서 잔존해도 안전).
        // 이력(sms_send_log)은 어느 경우든 남되, 미호출 케이스만 messageType=DRY_RUN 으로 구분된다.
        boolean dryRun = props.isDryRun();
        String override = props.getOverrideTo() == null ? "" : props.getOverrideTo().trim();
        if (dryRun && override.isBlank()) {
            String preview = substitute(slot.textFor(delayed), variables);
            log.info("[DRY-RUN] SMS 미발송 (실제 API 호출 안 함) — to={}, channel={}, group={}, tier={}, delayed={}, preview={}",
                    mask(to), channel, slot.groupCode(), slot.offsetDays(), delayed,
                    preview.length() > 100 ? preview.substring(0, 100) + "…" : preview);
            return SendOutcome.builder()
                    .success(true)
                    .messageType("DRY_RUN")
                    .statusCode("DRY_RUN")
                    .dryRun(true)
                    .build();
        }

        requireConfigured(slot, channel, delayed);

        String actualTo = to;
        if (dryRun && !override.isBlank()) {
            log.warn("[OVERRIDE-TO] dry-run 안 실 발송 — 수신자 대체: original={}, override={}, group={}, tier={}",
                    mask(to), mask(override), slot.groupCode(), slot.offsetDays());
            actualTo = override;
        }

        Message message = new Message();
        message.setFrom(props.getFrom());
        message.setTo(actualTo);

        try {
            DefaultMessageService service = messageService();
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
                 * 발송 직전 솔라피의 승인 템플릿 본문을 조회해 치환한다. 대체발송 SMS 본문도
                 * 이 값이 쓰이므로 .env 의 오래된 문자 본문과 승인 템플릿이 갈라지는 문제를 막는다.
                 */
                String templateText = alimtalkTemplateContent(service, slot.templateId());
                if (templateText.isBlank()) {
                    return failure("솔라피 알림톡 템플릿 본문이 비어 있습니다. templateId=" + slot.templateId());
                }
                message.setText(substitute(templateText, variables));
            } else {
                // 재조정된 대상에게는 경과 문장을 뺀 본문이 나간다(그래서 지연 건은 문자로만 보낸다).
                message.setText(substitute(slot.textFor(delayed), variables));
            }

            // showMessageList=true 를 명시하지 않으면 응답의 messageList 가 비어 오고
            // messageId 가 null 로 저장되어 웹훅 매칭(findBySolapiMessageId) 이 영영 실패한다.
            // Solapi SDK 1.0.3 의 SendRequestConfig 기본값이 false 라 반드시 지정해야 한다.
            SendRequestConfig config = new SendRequestConfig();
            config.setShowMessageList(true);
            MultipleDetailMessageSentResponse response = service.send(message, config);
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

    private String alimtalkTemplateContent(DefaultMessageService service, String templateId) {
        KakaoAlimtalkTemplateResponse response = service.getKakaoAlimtalkTemplate(templateId);
        if (response == null || response.getContent() == null) return "";
        return response.getContent();
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

    /** #{name}·#{surgeryDate} 등 치환. 알림톡은 솔라피가, 문자는 우리가 치환한다. */
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
