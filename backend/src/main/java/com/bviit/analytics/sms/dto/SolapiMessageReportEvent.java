package com.bviit.analytics.sms.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 솔라피 웹훅 SINGLE-REPORT 이벤트 1건 — 개별 메시지의 발송 결과가 확정되면 배열로 담겨 온다.
 *
 * <p>필드는 <a href="https://solapi.com/developers/api/webhook">솔라피 웹훅 문서</a>의 SINGLE-REPORT
 * payload 를 그대로 옮긴다. 알려진 필드만 record 로 잡고, 새 필드가 붙어도 500 이 나지 않도록
 * {@code @JsonIgnoreProperties(ignoreUnknown=true)} 로 여유를 둔다.
 *
 * <p>우리가 실제로 쓰는 것은 {@link #messageId}(조회 키) · {@link #statusCode}(성공/실패 판정) ·
 * {@link #dateReceived}(단말 도달 시각) · {@link #type}(대체발송 여부 추정). 나머지는 이력에
 * 남기지 않는다 — 이 record 로 딱 필요한 만큼만 파싱한다.
 *
 * <p>{@link #type} 값은 SMS·LMS·MMS·ATA·CTA·CTI·NSA·RCS_* 등. 요청 채널이 ALIMTALK 인데
 * 응답 type 이 ATA 가 아니면 대체발송으로 본다(payload 에 replacement 플래그가 없어 추정).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SolapiMessageReportEvent(
        String messageId,
        String groupId,
        String type,
        String to,
        String from,
        String statusCode,
        String statusMessage,
        String dateProcessed,
        String dateReported,
        String dateReceived,
        String networkCode
) {
}
