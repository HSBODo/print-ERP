package com.bviit.analytics.batch;

import com.bviit.analytics.batch.dto.BatchRunLog;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 배치 성공/실패를 Slack 채널로 전송. logging.slack.webhook-url 을 재사용해
 * 에러 알림과 같은 채널로 흐른다. webhook 미주입이면 조용히 스킵 — 로컬 안전.
 */
@Slf4j
@Component
@Profile("postgres-mart")
public class BatchSlackNotifier {

    private final String webhookUrl;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    public BatchSlackNotifier(@Value("${logging.slack.webhook-url:}") String webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    public void notifySuccess(String jobName, BatchRunLog.RunType type, LocalDate from, LocalDate to,
                              Map<String, Integer> tableStats, Duration elapsed) {
        String statsText = tableStats == null || tableStats.isEmpty()
                ? "_(no rows)_"
                : tableStats.entrySet().stream()
                        .map(e -> "• `" + e.getKey() + "` : " + e.getValue())
                        .reduce((a, b) -> a + "\n" + b)
                        .orElse("");
        String text = String.format(
                "✅ *배치 성공*  `%s`%n" +
                "• Type: `%s`  •  Range: `%s ~ %s`  •  Elapsed: `%s`%n" +
                "*Tables*%n%s",
                jobName, type, from, to, formatDuration(elapsed), statsText);
        send(text, "good");
    }

    public void notifyFailure(String jobName, BatchRunLog.RunType type, LocalDate from, LocalDate to,
                              String errorMessage, Duration elapsed) {
        String text = String.format(
                "❌ *배치 실패*  `%s`%n" +
                "• Type: `%s`  •  Range: `%s ~ %s`  •  Elapsed: `%s`%n" +
                "*Error*%n```%s```",
                jobName, type, from, to, formatDuration(elapsed), truncate(errorMessage, 800));
        send(text, "danger");
    }

    /**
     * 배치 자체 성공/실패가 아닌 관측 임계치 초과 등 경고 — 노란색.
     * 예: SMS 자동발송 FAILED 큐 누적이 임계치 초과 (관리자 개입 필요).
     */
    public void notifyWarning(String title, String body) {
        String text = String.format("⚠️ *%s*%n%s", title, body);
        send(text, "warning");
    }

    private void send(String text, String color) {
        if (webhookUrl == null || webhookUrl.isBlank()) return;
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "attachments", List.of(Map.of(
                            "color", color,
                            "text", text,
                            "mrkdwn_in", List.of("text")
                    ))
            ));
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.postForEntity(webhookUrl, new HttpEntity<>(payload, headers), String.class);
        } catch (Exception e) {
            log.warn("BatchSlackNotifier 전송 실패: {}", e.toString());
        }
    }

    private static String formatDuration(Duration d) {
        long s = d.toSeconds();
        return String.format("%dm %ds", s / 60, s % 60);
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }
}
