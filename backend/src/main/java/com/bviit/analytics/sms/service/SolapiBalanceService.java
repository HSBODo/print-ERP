package com.bviit.analytics.sms.service;

import com.bviit.analytics.sms.config.SolapiProperties;
import com.bviit.analytics.sms.dto.SmsSolapiBalanceInfo;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;

/**
 * 솔라피 계정 잔액 조회 — 자동 발송 큐 카드에서 관리자에게 잔액·예치금을 노출한다.
 *
 * <p>SDK({@code DefaultMessageService#getBalance}) 를 <b>쓰지 않는다</b>. 두 가지 이유:
 * <ol>
 *   <li>SDK 의 {@code Balance} 모델이 값을 {@link Float} 로 담아 큰 금액·소수점에서 정밀도가 밀린다
 *       (예: 708671.61 → 708671.625). 원 단위 화면에서 반올림 오차가 눈에 띈다.</li>
 *   <li>SDK 는 {@code balance}·{@code point} 만 노출하고 <b>{@code deposit}(예치금)</b>·{@code balanceOnly}
 *       는 빠져 있다. 솔라피 콘솔이 표시하는 "잔액"은 사실 <code>deposit</code> 이라, SDK 값과 콘솔 값이
 *       달라 관리자를 혼란시킨다 (2026-08-31 확인).</li>
 * </ol>
 * 그래서 {@code /cash/v1/balance} 를 {@link RestClient} 로 직접 호출하고 {@link BigDecimal} 로 파싱한다.
 *
 * <p>API 키 미설정 시 조용히 미설정 응답을 돌려주고(500 안 던짐), 조회 실패 시 error 로 담아
 * 프론트가 "조회 실패" 로 표시한다. 발송에 필수인 값은 아니라 서비스 오류로 취급하지 않는다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SolapiBalanceService {

    private static final String BALANCE_URL = "https://api.solapi.com/cash/v1/balance";

    private final SolapiProperties props;

    private final RestClient restClient = RestClient.builder().build();
    private final SecureRandom random = new SecureRandom();

    public SmsSolapiBalanceInfo getBalance() {
        if (!props.isConfigured()) {
            return SmsSolapiBalanceInfo.notConfigured();
        }
        try {
            JsonNode body = restClient.get()
                    .uri(BALANCE_URL)
                    .header("Authorization", buildAuthorizationHeader())
                    .retrieve()
                    .body(JsonNode.class);

            if (body == null) {
                return SmsSolapiBalanceInfo.error("솔라피 응답 없음");
            }
            return SmsSolapiBalanceInfo.of(
                    readDecimal(body, "balance"),
                    readDecimal(body, "point"),
                    readDecimal(body, "deposit"),
                    readDecimal(body, "balanceOnly")
            );
        } catch (Exception e) {
            log.warn("솔라피 잔액 조회 실패: {}", e.getMessage());
            return SmsSolapiBalanceInfo.error(trimReason(e.getMessage()));
        }
    }

    /** HMAC-SHA256 서명 헤더 — 솔라피는 {@code date + salt} 를 시크릿으로 HMAC 서명한다. */
    private String buildAuthorizationHeader() throws Exception {
        String date = Instant.now().toString();
        String salt = randomHex();
        String signature = hmacSha256(date + salt, props.getApiSecret());
        return "HMAC-SHA256 apiKey=%s, date=%s, salt=%s, signature=%s"
                .formatted(props.getApiKey(), date, salt, signature);
    }

    private String randomHex() {
        byte[] buf = new byte[16];
        random.nextBytes(buf);
        return HexFormat.of().formatHex(buf);
    }

    private static String hmacSha256(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }

    private static BigDecimal readDecimal(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) return null;
        return value.decimalValue();
    }

    private static String trimReason(String reason) {
        if (reason == null) return "알 수 없는 오류";
        return reason.length() > 200 ? reason.substring(0, 200) + "…" : reason;
    }
}
