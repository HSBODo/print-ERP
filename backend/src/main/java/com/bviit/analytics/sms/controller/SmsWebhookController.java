package com.bviit.analytics.sms.controller;

import com.bviit.analytics.sms.config.SolapiProperties;
import com.bviit.analytics.sms.dto.SolapiMessageReportEvent;
import com.bviit.analytics.sms.service.SolapiWebhookService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

/**
 * 솔라피 웹훅 수신부 — 발송 결과가 확정되면 솔라피가 이곳으로 POST 를 던진다.
 *
 * <h3>왜 이 컨트롤러가 별도인가</h3>
 * {@code /api/sms-management/**} 는 ADMIN 롤 강제인데 웹훅은 JWT 없이 들어와야 한다.
 * SecurityConfig 에서 이 경로({@code /api/sms/webhook/**})만 permitAll 로 열고, 대신
 * <b>서명 검증이 인증을 대체</b>한다.
 *
 * <h3>엔드포인트 — 이벤트 모아 받기</h3>
 * {@code POST /api/sms/webhook/solapi} 하나로 모든 이벤트를 받고 헤더로 분기한다.
 * 지금은 SINGLE-REPORT 만 처리하지만, GROUP-REPORT·FAX-RECEIVE 를 추가할 때 경로가 바뀌지
 * 않도록 미리 이벤트-와일드카드 구조로 잡아 뒀다.
 *
 * <h3>서명 검증</h3>
 * {@code X-Solapi-Secret} 헤더 = {@code sha1(secret)}. secret 이 설정돼 있지 않으면 검증 skip
 * (로컬 부트스트랩용). 운영은 {@code SOLAPI_WEBHOOK_SECRET} 을 반드시 채워야 한다 — 그렇지 않으면
 * 아무나 발송 결과를 조작할 수 있다.
 *
 * <h3>응답</h3>
 * 항상 5초 안에 200 을 준다. 처리 도중 예외가 나도 200 을 반환하되 로그만 남긴다 — 웹훅은
 * 최대 8번 재시도 후 자동 INACTIVE 되므로 재전송이 오히려 해롭다. fallback 스케줄러가
 * ({@code SolapiSyncService.runScheduledFallback}) 놓친 건을 하루 1회 걷어낸다.
 */
@Slf4j
@RestController
@RequestMapping("/api/sms/webhook")
@RequiredArgsConstructor
public class SmsWebhookController {

    /** 우리가 처리하는 이벤트 이름 — 콘솔에서 이 이벤트로 등록한 것만 이 컨트롤러에 온다. */
    private static final String EVENT_SINGLE_REPORT = "SINGLE-REPORT";
    private static final String HEADER_EVENT_NAME = "X-Solapi-Event-Name";
    private static final String HEADER_SIGNATURE = "X-Solapi-Secret";

    private final SolapiProperties props;
    private final SolapiWebhookService webhookService;

    @PostMapping("/solapi")
    public ResponseEntity<Void> receive(
            @RequestHeader(name = HEADER_EVENT_NAME, required = false) String eventName,
            @RequestHeader(name = HEADER_SIGNATURE, required = false) String signature,
            @RequestBody List<SolapiMessageReportEvent> events
    ) {
        if (!verifySignature(signature)) {
            log.warn("솔라피 웹훅 서명 불일치 — event={}, requestSize={}", eventName,
                    events == null ? 0 : events.size());
            return ResponseEntity.status(401).build();
        }
        // SINGLE-REPORT 이외 이벤트는 조용히 200 — 콘솔 설정이 확장돼도 500 이 안 나게.
        if (!EVENT_SINGLE_REPORT.equals(eventName)) {
            log.info("솔라피 웹훅 skip — 처리 대상 아님: event={}", eventName);
            return ResponseEntity.ok().build();
        }
        try {
            webhookService.applyMessageReports(events);
        } catch (Exception e) {
            // 웹훅에 500 을 돌려주면 자동 재시도 + 8회 실패 시 INACTIVE. 처리 실패는 로그만.
            log.error("솔라피 웹훅 처리 실패 — event={}, size={}", eventName,
                    events == null ? 0 : events.size(), e);
        }
        return ResponseEntity.ok().build();
    }

    /**
     * secret 이 설정돼 있으면 {@code sha1(secret)} 을 헤더 값과 시간 상수 비교한다.
     * 설정이 비어 있으면 검증 skip 하고 WARN 로그 — 운영 사고를 화면·로그에서 잡기 위함.
     */
    private boolean verifySignature(String signature) {
        if (!props.isWebhookSecretConfigured()) {
            log.warn("솔라피 웹훅 시크릿 미설정 — 서명 검증 skip. 운영이면 SOLAPI_WEBHOOK_SECRET 을 설정할 것.");
            return true;
        }
        if (signature == null || signature.isBlank()) return false;
        String expected = sha1Hex(props.getWebhookSecret());
        // MessageDigest.isEqual 는 length 다를 때 false — 그대로 사용 (타이밍 공격 방지).
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8));
    }

    /** 소문자 hex(SHA-1) — 솔라피 문서 예시(Node crypto sha1.digest('hex')) 와 동일 규칙. */
    private static String sha1Hex(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-1 지원되지 않음", e);
        }
    }
}
