package com.bviit.analytics.etc.dto;

import com.bviit.analytics.etc.entity.DreamlensLedgerEntry;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 드림렌즈 장부 DTO 의 JSON 키 계약 고정.
 *
 * 배경: getMNewRevenue() 는 Java Beans 규칙상 앞 두 글자가 모두 대문자(MN)라
 * 디캐피털라이즈되지 않아, 기본 직렬화 시 키가 "mnewRevenue" 로 나간다.
 * 프론트(api/etc 의 zod 스키마)는 "mNewRevenue" 를 요구하므로 그대로 두면
 * 응답 파싱이 깨져 화면 전체가 에러로 떨어진다.
 * DTO 의 @JsonAutoDetect(getter=NONE, field=ANY) 가 이를 막는다.
 * rLensName·lLensName 등 단일 소문자+대문자 조합도 같은 이유로 함께 검증한다.
 */
class DreamlensLedgerJsonTest {

    // Spring Boot 자동설정과 동일하게 — 날짜를 타임스탬프 배열이 아닌 ISO 문자열로 쓴다.
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private DreamlensLedgerEntry entry() {
        return DreamlensLedgerEntry.builder()
                .id(1L)
                .entryDate(LocalDate.of(2026, 8, 2))
                .visitType("신규")
                .customerNo("2234528")
                .customerName("정준원")
                .examiner("권성현")
                .purchaseType("본원재고구매")
                .rLensName("CRT").rBox("1").rLensSpec("83-525-33").rColor("G")
                .rReturnDate(LocalDate.of(2026, 8, 9))
                .lLensName("CRT").lBox("1").lLensSpec("83-525-33").lColor("R")
                .lReturnDate(LocalDate.of(2026, 8, 9))
                .dlNewRevenue(1_000_000)
                .mNewRevenue(300_000)
                .mRepurchaseRevenue(120_000)
                .hlNewRevenue(50_000)
                .treatmentRevenue(41_800)
                .build();
    }

    @Test
    void 응답_DTO_의_JSON_키가_프론트_계약과_일치한다() throws Exception {
        String json = MAPPER.writeValueAsString(DreamlensLedgerRow.from(entry()));

        assertThat(json).contains("\"mNewRevenue\":300000");
        assertThat(json).contains("\"mRepurchaseRevenue\":120000");
        assertThat(json).contains("\"hlNewRevenue\":50000");
        assertThat(json).contains("\"rLensName\":\"CRT\"");
        assertThat(json).contains("\"lLensName\":\"CRT\"");
        assertThat(json).contains("\"entryDate\":\"2026-08-02\"");

        assertThat(json).doesNotContain("mnewRevenue");
        assertThat(json).doesNotContain("mrepurchaseRevenue");
    }

    @Test
    void 총매출은_매출_10종_합계다() {
        // 1,000,000 + 300,000 + 120,000 + 50,000 + 41,800
        assertThat(entry().totalRevenue()).isEqualTo(1_511_800);
        assertThat(DreamlensLedgerRow.from(entry()).getTotalRevenue()).isEqualTo(1_511_800);
    }

    @Test
    void 요청_DTO_는_같은_키로_역직렬화된다() throws Exception {
        String json = """
                {"entryDate":"2026-08-02","customerName":"정준원",
                 "mNewRevenue":300000,"mRepurchaseRevenue":120000,
                 "rLensName":"CRT","lLensName":"CRT","dlNewRevenue":1000000}
                """;

        DreamlensLedgerRequest request = MAPPER.readValue(json, DreamlensLedgerRequest.class);

        assertThat(request.getEntryDate()).isEqualTo(LocalDate.of(2026, 8, 2));
        assertThat(request.getMNewRevenue()).isEqualTo(300_000);
        assertThat(request.getMRepurchaseRevenue()).isEqualTo(120_000);
        assertThat(request.getRLensName()).isEqualTo("CRT");
        assertThat(request.toEntity().totalRevenue()).isEqualTo(1_420_000);
    }
}
