package com.bviit.analytics.common.web;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * ⚠️ 임시 검증용 컨트롤러 — slack-logger 라이브러리 동작 확인 후 삭제할 것.
 *
 * 프로파일 가드: !prod (운영에는 배포되지 않음)
 * 경로: /api/admin/dev/** — SecurityConfig 의 /api/admin/** 규칙에 걸려 ADMIN 롤 필수.
 *
 * 사용법:
 *   1) 관리자로 로그인해서 JWT 획득
 *   2) curl -H "Authorization: Bearer $TOKEN" http://localhost:18080/api/admin/dev/slack-test/error
 *   3) Slack 채널에 에러 로그 도착 확인
 *
 * 검증 완료 후: 이 파일 삭제.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/dev/slack-test")
@Profile("!prod")
public class SlackLogTestController {

    @GetMapping("/error")
    public Map<String, Object> logError(
            @RequestParam(defaultValue = "슬랙 웹훅 연결 검증용 강제 에러") String message
    ) {
        log.error("SlackLogTest: {}", message);
        return Map.of("ok", true, "level", "ERROR", "message", message);
    }

    @GetMapping("/warn")
    public Map<String, Object> logWarn(
            @RequestParam(defaultValue = "슬랙 웹훅 WARN 레벨 테스트") String message
    ) {
        log.warn("SlackLogTest: {}", message);
        return Map.of("ok", true, "level", "WARN", "message", message,
                "note", "logging.slack.level 이 WARN 이하일 때만 Slack 전송됨");
    }

    @GetMapping("/throw")
    public Map<String, Object> logThrow() {
        try {
            throw new IllegalStateException("의도적 예외 — 스택트레이스가 Slack 에 포함되는지 확인");
        } catch (Exception e) {
            log.error("SlackLogTest: 예외 발생", e);
        }
        return Map.of("ok", true, "level", "ERROR", "note", "스택트레이스 포함");
    }
}
