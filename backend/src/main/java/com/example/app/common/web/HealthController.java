package com.example.app.common.web;

import com.example.app.common.dto.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 애플리케이션 헬스체크 엔드포인트 — 인증 없이(SecurityConfig permitAll) 호출.
 *
 * <p>GET /api/health — liveness. 앱 프로세스 살아있음만 확인. 의존성 체크 없음.
 * Docker HEALTHCHECK·로드밸런서 헬스 프로브용. DB 블립에 재시작이 트리거되지 않도록
 * 무조건 200 반환.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public ApiResponse<Map<String, Object>> liveness() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("timestamp", Instant.now().toString());
        body.put("uptimeSeconds", ManagementFactory.getRuntimeMXBean().getUptime() / 1000);
        return ApiResponse.ok(body);
    }
}
