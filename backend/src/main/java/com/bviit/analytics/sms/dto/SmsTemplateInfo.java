package com.bviit.analytics.sms.dto;

import java.util.List;

/**
 * 발송 차수 슬롯 — 화면 목록·발송 검증·예정일 계산 공용.
 *
 * 차수는 3개(T1~T3)로 고정이지만, <b>같은 차수라도 수술 그룹마다 문구와 시점이 다르다</b>.
 * 그래서 차수 하나가 그룹별 슬롯 목록(groups)을 품는다.
 *
 * 예) 1차 — 스마일 D+1 · 라식 D+1 · 렌즈삽입 D+3 · 라섹 D+5
 *
 * offsetDays 는 여기 없다. 대상의 수술 종류를 알아야 정해지는 값이라
 * {@link SmsTemplateGroupInfo#offsetDays()} 에 둔다.
 */
public record SmsTemplateInfo(
        /** T1 / T2 / T3 — 발송 이력의 template_code 와 같은 값이다. */
        String code,
        String label,
        /** 1 / 2 / 3 */
        int tier,
        List<SmsTemplateGroupInfo> groups
) {
    // 준비 여부는 그룹마다 alimtalkReady/smsReady 로 내려간다. 차수 단위로 접어 주던
    // anyReady()·unreadyGroupLabels() 는 화면의 '설정 미완료' 경고와 함께 걷어냈다
    // (2026-08-13) — 지금은 템플릿 팝업과 문구 미리보기가 슬롯별로 '문구 미확정'을 드러낸다.
}
