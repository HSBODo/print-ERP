package com.bviit.analytics.sms.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.List;

/**
 * 차수 × 수술 그룹 슬롯 하나. 실제 발송에 쓰이는 최소 단위다.
 *
 * templateId/smsText 는 발송 내부용이라 화면 응답에 내리지 않는다(@JsonIgnore) —
 * 문구 원문이 브라우저로 나가면 승인 전 문구가 외부에 노출될 수 있다.
 *
 * opTypes 는 화면이 <b>행마다 그룹을 찾을 때</b> 쓴다. 마트가 분류한 op_type 코드라
 * 프론트가 수술명을 다시 해석할 필요가 없다.
 */
public record SmsTemplateGroupInfo(
        String groupCode,
        String groupLabel,
        List<String> opTypes,
        /** 수술일(기준일)로부터 며칠 뒤 — 그룹마다 다르다. 1차: 스마일 1 · 렌즈삽입 3 · 라섹 5 */
        int offsetDays,
        @JsonIgnore String templateId,
        @JsonIgnore String smsText,
        /**
         * 지연 발송용 본문 — <b>경과 선언 문장을 뺀 버전</b>이다.
         *
         * 홀딩 해제·연락처 수정으로 기준일이 밀리면 "수술 후 일주일이 지났습니다"가 사실과
         * 어긋난다(수술 25일 뒤에 2차가 나갈 수 있다). 그래서 그 문장을 뺀 본문을 따로 둔다.
         * 1차는 경과 선언이 없어 기본 본문을 그대로 쓴다.
         */
        @JsonIgnore String smsTextDelayed,
        boolean alimtalkReady,
        boolean smsReady,
        /** 지연 본문이 준비됐는지 — 재조정된 대상은 이게 없으면 보내지 않는다. */
        boolean delayedReady
) {
    /** 알림톡·문자 어느 쪽으로든 보낼 수 있는지. 둘 다 아니면 이 슬롯은 발송되지 않는다. */
    public boolean sendable() {
        return alimtalkReady || smsReady;
    }

    /**
     * 이 발송에 쓸 본문. 재조정된 대상에게는 경과 문장을 뺀 쪽을 준다.
     * 지연 건은 <b>문자로만</b> 나간다 — 알림톡은 승인된 템플릿이 곧 본문이라
     * 변형 문구를 쓰려면 카카오 심사를 따로 받아야 한다(고객케어 TF 협의, 2026-08-14).
     */
    public String textFor(boolean delayed) {
        return delayed ? smsTextDelayed : smsText;
    }
}
