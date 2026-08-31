package com.bviit.analytics.sms.dto;

/**
 * 솔라피에서 조회한 알림톡 템플릿 정보 — 관리자 화면 "템플릿" 모달용.
 *
 * <p>우리 설정에 정의된 15슬롯(5그룹 × 3차수) 중 {@code templateId} 가 채워진 것만
 * 솔라피 API 로 검증해 상태·본문을 함께 노출한다.
 *
 * <h3>필드 성격</h3>
 * <ul>
 *   <li>{@code groupCode / tier / templateLabel} — 우리 슬롯 좌표 (환경에서 옴)</li>
 *   <li>{@code templateId} — 우리가 설정한 알림톡 ID</li>
 *   <li>{@code found} — 그 ID 가 솔라피 계정 안에서 실제로 조회됐는지</li>
 *   <li>{@code status / name / content / messageType / categoryCode} — 솔라피 응답 값</li>
 *   <li>{@code errorMessage} — 조회 실패 사유(개별 슬롯 단위)</li>
 * </ul>
 *
 * <p>ID 가 설정 안 된 슬롯은 애초에 목록에 넣지 않는다(사용자 요구: "템플릿 아이디 존재하는것만 표시").
 */
public record SmsSolapiTemplateInfo(
        String groupCode,
        String groupLabel,
        int tier,
        String templateLabel,
        String templateId,
        boolean found,
        String status,
        String name,
        String content,
        String messageType,
        String categoryCode,
        String errorMessage
) {
}
