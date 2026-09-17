package com.bviit.analytics.marketing.util;

import java.util.Locale;

/**
 * 해외마케팅 CRM 매칭용 CUSTOM 컬럼 정규화 헬퍼.
 *
 * 저장소(전화·이메일 스트림 필터)와 서비스(후보 매칭 판정)가 <b>반드시 같은 규칙</b>으로
 * 정규화해야 매칭이 일치한다 — 한쪽만 바꾸면 후보가 새고 매칭이 조용히 어긋난다.
 */
public final class OverseasCustomerKeys {

    private OverseasCustomerKeys() {}

    /** 연락처의 뒷 8자리(숫자만). 8자리 미만이면 빈 문자열. */
    public static String phoneSuffix(String contact) {
        if (contact == null) return "";
        String digits = contact.replaceAll("[^0-9]", "");
        return digits.length() >= 8 ? digits.substring(digits.length() - 8) : "";
    }

    /**
     * 이메일 정규화 — 소문자화 후 '@' 주변 공백/줄바꿈으로 잘라 단일 토큰을 뽑는다.
     * (CRM·시트에 서식이 섞여 있는 경우가 있어 여유 있게 파싱한다.)
     */
    public static String email(String raw) {
        if (raw == null) return "";
        String text = raw.toLowerCase(Locale.ROOT);
        int at = text.indexOf('@');
        if (at < 1) return "";
        int space = text.lastIndexOf(' ', at);
        int line = Math.max(text.lastIndexOf('\n', at), text.lastIndexOf('\r', at));
        int start = Math.max(space, line) + 1;
        int end = text.length();
        for (int index = at + 1; index < text.length(); index++) {
            if (Character.isWhitespace(text.charAt(index))) {
                end = index;
                break;
            }
        }
        return text.substring(start, end).trim();
    }
}
