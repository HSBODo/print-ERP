package com.bviit.analytics.sms.dto;

import java.math.BigDecimal;

/**
 * 솔라피 계정 잔액 조회 결과 — 자동 발송 큐 카드에 노출한다.
 *
 * <ul>
 *   <li>{@code balance} — 부가세 제외 실사용 가능액(원). SDK 의 {@code Balance.balance} 필드.</li>
 *   <li>{@code point} — 포인트 잔액(원). 발송에 우선 소진.</li>
 *   <li>{@code deposit} — 예치금(원, 부가세 포함). <b>솔라피 콘솔의 "잔액"과 일치</b>.</li>
 *   <li>{@code balanceOnly} — 순수 충전 잔고(원). 예치금 반영 전 값.</li>
 *   <li>{@code configured} — API 키가 채워져 있는지. false 면 다른 필드는 무의미.</li>
 *   <li>{@code errorMessage} — API 호출 실패 사유. 성공 시 null.</li>
 * </ul>
 *
 * <p>SDK 의 {@code Balance} 는 {@code Float} 로 값을 담아 소수점 정밀도 손실이 나고
 * {@code deposit}·{@code balanceOnly} 필드도 노출하지 않아, 서비스가 API 를 직접 호출해
 * {@link BigDecimal} 로 파싱한다.
 */
public record SmsSolapiBalanceInfo(
        BigDecimal balance,
        BigDecimal point,
        BigDecimal deposit,
        BigDecimal balanceOnly,
        boolean configured,
        String errorMessage
) {
    public static SmsSolapiBalanceInfo notConfigured() {
        return new SmsSolapiBalanceInfo(null, null, null, null, false, null);
    }

    public static SmsSolapiBalanceInfo error(String message) {
        return new SmsSolapiBalanceInfo(null, null, null, null, true, message);
    }

    public static SmsSolapiBalanceInfo of(BigDecimal balance, BigDecimal point, BigDecimal deposit, BigDecimal balanceOnly) {
        return new SmsSolapiBalanceInfo(balance, point, deposit, balanceOnly, true, null);
    }
}
