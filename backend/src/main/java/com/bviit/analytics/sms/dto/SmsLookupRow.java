package com.bviit.analytics.sms.dto;

/**
 * 차트번호 조회 결과 — 발송 대상 추가 팝업에서 정보를 채우는 데 쓴다.
 * found=false 면 마트에 수술 기록이 없다는 뜻(직접 입력으로 계속 진행할 수 있다).
 * alreadyRegistered=true 면 같은 (차트번호, 수술일)이 이미 대상에 있다.
 */
public record SmsLookupRow(
        boolean found,
        boolean alreadyRegistered,
        String chartNo,
        String name,
        String phone,
        String surgeryDate,
        String surgeryType,
        /**
         * 마트 surgery_op_type() 분류 코드. <b>빠뜨리면 안 된다</b> — 수동 등록 행의 수술 분류가
         * 비어 ETC 로 떨어지고, ETC 문구가 없으면 그 사람에게는 영영 발송되지 않는다.
         * (2026-08-14: 이 필드가 record 에서 누락돼 화면의 [조회]가 스키마 검증에서 통째로 실패했다.)
         */
        String opType,
        String surgeryR,
        String surgeryL
) {
    public static SmsLookupRow notFound(String chartNo) {
        return new SmsLookupRow(false, false, chartNo, "", "", "", "", "", "", "");
    }
}
