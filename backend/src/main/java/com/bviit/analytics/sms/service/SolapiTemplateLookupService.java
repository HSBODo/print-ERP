package com.bviit.analytics.sms.service;

import com.bviit.analytics.sms.config.SolapiProperties;
import com.bviit.analytics.sms.config.SurgeryGroup;
import com.bviit.analytics.sms.dto.SmsSolapiTemplateInfo;
import com.bviit.analytics.sms.dto.SmsTemplateGroupInfo;
import com.bviit.analytics.sms.dto.SmsTemplateInfo;
import com.solapi.sdk.SolapiClient;
import com.solapi.sdk.message.dto.response.kakao.KakaoAlimtalkTemplateResponse;
import com.solapi.sdk.message.service.DefaultMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 우리 설정(15슬롯 = 5그룹 × 3차수) 중 <b>templateId 가 채워진 슬롯만</b>
 * 솔라피 API 로 검증해 상태·본문을 함께 돌려주는 조회 서비스.
 *
 * <p>발송 흐름(SolapiSendService) 과 SDK 인스턴스는 공유하지 않는다 —
 * 조회는 부하가 크지 않고, 인증 흐름·에러 처리를 별도로 관리하는 편이 안전하다.
 *
 * <h3>미설정·미확인 처리</h3>
 * <ul>
 *   <li>API 키 미설정: 빈 목록 + 로그 warn. 화면은 배너로 안내.</li>
 *   <li>ID 미설정 슬롯: 목록에서 제외(사용자 요구 — "템플릿 아이디 존재하는것만 표시").</li>
 *   <li>ID 는 있는데 솔라피 조회 실패: {@code found=false} + {@code errorMessage} 로 그 슬롯만 표기.</li>
 * </ul>
 *
 * <p>슬롯별로 개별 조회를 쓴다({@code getKakaoAlimtalkTemplate(id)}) — 페이징 처리가 없고,
 * 실패해도 다른 슬롯 결과를 못 받는 사고를 막을 수 있다. 15콜은 순차 실행으로 충분히 빠르다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SolapiTemplateLookupService {

    private final SolapiProperties props;

    private volatile DefaultMessageService messageService;

    /**
     * 설정된 슬롯을 훑어 솔라피에서 조회한 결과를 반환한다.
     * SDK 호출 자체가 예외를 던지면 해당 슬롯만 error 로 표시하고 나머지는 계속 진행.
     */
    public List<SmsSolapiTemplateInfo> listConfigured() {
        if (!props.isConfigured()) {
            log.info("SolapiTemplateLookupService: API 키 미설정 — 빈 목록 반환");
            return List.of();
        }
        DefaultMessageService service = messageService();
        List<SmsSolapiTemplateInfo> result = new ArrayList<>();
        for (SmsTemplateInfo tier : props.templates()) {
            for (SmsTemplateGroupInfo slot : tier.groups()) {
                if (slot.templateId() == null || slot.templateId().isBlank()) continue;
                result.add(lookupOne(service, tier, slot));
            }
        }
        return result;
    }

    private SmsSolapiTemplateInfo lookupOne(DefaultMessageService service,
                                            SmsTemplateInfo tier, SmsTemplateGroupInfo slot) {
        SurgeryGroup group = SurgeryGroup.byCode(slot.groupCode());
        try {
            KakaoAlimtalkTemplateResponse response = service.getKakaoAlimtalkTemplate(slot.templateId());
            if (response == null) {
                return notFound(tier, slot, group, "솔라피 응답 없음");
            }
            return new SmsSolapiTemplateInfo(
                    group.code(),
                    group.label(),
                    tier.tier(),
                    tier.label(),
                    slot.templateId(),
                    true,
                    response.getStatus() == null ? null : response.getStatus().name(),
                    response.getName(),
                    response.getContent(),
                    response.getMessageType() == null ? null : response.getMessageType().name(),
                    response.getCategoryCode(),
                    null
            );
        } catch (Exception e) {
            log.warn("솔라피 템플릿 조회 실패: group={}, tier={}, id={}, reason={}",
                    group.code(), tier.tier(), slot.templateId(), e.getMessage());
            return notFound(tier, slot, group, trimReason(e.getMessage()));
        }
    }

    private SmsSolapiTemplateInfo notFound(SmsTemplateInfo tier, SmsTemplateGroupInfo slot,
                                           SurgeryGroup group, String reason) {
        return new SmsSolapiTemplateInfo(
                group.code(), group.label(), tier.tier(), tier.label(),
                slot.templateId(), false,
                null, null, null, null, null,
                reason
        );
    }

    private static String trimReason(String reason) {
        if (reason == null) return "알 수 없는 오류";
        return reason.length() > 200 ? reason.substring(0, 200) + "…" : reason;
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
