package com.bviit.analytics.sms.dto;

import com.bviit.analytics.sms.entity.SmsOptOut;

/**
 * 수신거부 한 줄 — 목록 확인용.
 * 번호는 <b>가려서</b> 내린다. 누가 거부했는지 확인하는 데는 뒷자리면 충분하고,
 * 전체 번호를 화면까지 내리면 그 자체가 노출 경로가 된다(기획서 12장).
 */
public record SmsOptOutRow(
        Long id,
        String phoneMasked,
        String chartNo,
        String name,
        String source,
        String createdAt,
        String createdBy
) {
    public static SmsOptOutRow from(SmsOptOut entry) {
        return new SmsOptOutRow(
                entry.getId(),
                mask(entry.getPhone()),
                nz(entry.getChartNo()),
                nz(entry.getName()),
                entry.getSource(),
                entry.getCreatedAt() == null ? "" : entry.getCreatedAt().toString(),
                nz(entry.getCreatedBy()));
    }

    private static String mask(String phone) {
        if (phone == null || phone.length() < 8) return "***";
        return phone.substring(0, 3) + "-****-" + phone.substring(phone.length() - 4);
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }
}
