package com.bviit.analytics.marketing.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/** 서비스 계정으로 Google Sheets Values API를 읽는 최소 클라이언트. */
@Component
@ConditionalOnProperty(prefix = "overseas.google-sheets", name = "sync-enabled", havingValue = "true")
public class OverseasMarketingSheetClient {

    private static final String SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
    private static final String JWT_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String credentialsBase64;
    private final String credentialsFile;
    private final String spreadsheetId;
    private final String range;

    private String cachedToken;
    private long cachedTokenExpiresAt;

    public OverseasMarketingSheetClient(
            ObjectMapper objectMapper,
            @Value("${overseas.google-sheets.credentials-base64:}") String credentialsBase64,
            @Value("${overseas.google-sheets.credentials-file:}") String credentialsFile,
            @Value("${overseas.google-sheets.spreadsheet-id}") String spreadsheetId,
            @Value("${overseas.google-sheets.range}") String range
    ) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().build();
        this.credentialsBase64 = credentialsBase64;
        this.credentialsFile = credentialsFile;
        this.spreadsheetId = spreadsheetId;
        this.range = range;
    }

    public List<List<String>> readRows() {
        try {
            String encodedRange = URLEncoder.encode(range, StandardCharsets.UTF_8).replace("+", "%20");
            URI uri = URI.create("https://sheets.googleapis.com/v4/spreadsheets/"
                    + spreadsheetId + "/values/" + encodedRange);
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .header("Authorization", "Bearer " + accessToken())
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new IllegalStateException("Google Sheet 조회 실패 (HTTP " + response.statusCode() + ")");
            }
            JsonNode values = objectMapper.readTree(response.body()).path("values");
            List<List<String>> rows = new ArrayList<>();
            if (values.isArray()) {
                for (JsonNode rowNode : values) {
                    List<String> row = new ArrayList<>();
                    rowNode.forEach(cell -> row.add(cell.asText("")));
                    rows.add(row);
                }
            }
            return rows;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Google Sheet 조회가 중단되었습니다.", exception);
        } catch (IOException exception) {
            throw new IllegalStateException("Google Sheet 조회에 실패했습니다.", exception);
        }
    }

    private synchronized String accessToken() throws IOException, InterruptedException {
        long now = Instant.now().getEpochSecond();
        if (cachedToken != null && now < cachedTokenExpiresAt - 60) {
            return cachedToken;
        }

        JsonNode credentials = objectMapper.readTree(credentialsJson());
        String tokenUri = credentials.path("token_uri").asText("https://oauth2.googleapis.com/token");
        String assertion = signedAssertion(
                credentials.path("client_email").asText(),
                credentials.path("private_key").asText(),
                tokenUri,
                now);
        String form = "grant_type=" + encode(JWT_GRANT) + "&assertion=" + encode(assertion);
        HttpRequest request = HttpRequest.newBuilder(URI.create(tokenUri))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("Google 인증 실패 (HTTP " + response.statusCode() + ")");
        }
        JsonNode token = objectMapper.readTree(response.body());
        cachedToken = token.path("access_token").asText();
        cachedTokenExpiresAt = now + token.path("expires_in").asLong(3600);
        if (cachedToken.isBlank()) {
            throw new IllegalStateException("Google 인증 응답에 access_token이 없습니다.");
        }
        return cachedToken;
    }

    private byte[] credentialsJson() throws IOException {
        if (!credentialsBase64.isBlank()) {
            return Base64.getDecoder().decode(credentialsBase64);
        }
        if (!credentialsFile.isBlank()) {
            return Files.readAllBytes(Path.of(credentialsFile));
        }
        throw new IllegalStateException("Google Sheet 서비스 계정 자격증명이 설정되지 않았습니다.");
    }

    private String signedAssertion(String clientEmail, String privateKeyPem, String tokenUri, long issuedAt) {
        try {
            String header = base64Url(objectMapper.writeValueAsBytes(Map.of("alg", "RS256", "typ", "JWT")));
            String payload = base64Url(objectMapper.writeValueAsBytes(Map.of(
                    "iss", clientEmail,
                    "scope", SHEETS_SCOPE,
                    "aud", tokenUri,
                    "iat", issuedAt,
                    "exp", issuedAt + 3600
            )));
            String unsigned = header + "." + payload;
            Signature signer = Signature.getInstance("SHA256withRSA");
            signer.initSign(readPrivateKey(privateKeyPem));
            signer.update(unsigned.getBytes(StandardCharsets.UTF_8));
            return unsigned + "." + base64Url(signer.sign());
        } catch (Exception exception) {
            throw new IllegalStateException("Google 서비스 계정 JWT 생성에 실패했습니다.", exception);
        }
    }

    private PrivateKey readPrivateKey(String pem) throws Exception {
        String normalized = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] keyBytes = Base64.getDecoder().decode(normalized);
        return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(keyBytes));
    }

    private String base64Url(byte[] value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
