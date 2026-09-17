package com.bviit.analytics.marketing.service;

import com.bviit.analytics.marketing.repository.OverseasMarketingRepository;
import com.bviit.analytics.marketing.repository.OverseasMarketingRepository.PhoneEmailCandidates;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * 해외마케팅 CRM 자동 매칭 4단계의 판정 규칙을 못 박는다.
 * 규칙은 docs/marketing/overseas-crm-matching.md §4 에 정리돼 있다.
 *
 * 왜 잠가두나 — 매칭 조건이 조용히 바뀌면 (a) 다른 사람으로 오매칭되어 CRM 파생값(수술·비용)이 잘못 붙거나,
 * (b) 확정 가능한 건이 계속 '확인필요'로 남아 담당자가 매번 팝업을 열게 된다. 둘 다 조용한 사고라서 테스트로 지킨다.
 */
class OverseasMarketingCrmEnricherTest {

    private final OverseasMarketingRepository repository = mock(OverseasMarketingRepository.class);
    private final OverseasMarketingCrmEnricher enricher = new OverseasMarketingCrmEnricher(repository);

    /**
     * findCandidatesByPhoneOrEmail 은 이름 매칭이 성공하는 경로에서도 항상 호출된다(전화·이메일 키가 있으면).
     * Mockito 기본값이 null 이면 timed2 로그에서 NPE 가 나므로 빈 결과로 초기화한다.
     */
    @BeforeEach
    void stubDefaults() {
        when(repository.findCandidatesByPhoneOrEmail(any(), any())).thenReturn(noCandidates());
    }

    // ── 1단계: 이름 + 생일 정확 일치 ───────────────────────────────────

    @Test
    void 이름과_생일이_정확히_일치하면_1단계에서_매칭한다() {
        Map<String, Object> row = row(100L, "홍길동", "1990-08-15", "01011112222", "");
        when(repository.findCandidatesByNames(List.of("홍길동")))
                .thenReturn(List.of(customer("C100", "홍길동", "1990-08-15", "01011112222")));

        enricher.matchRows(new ArrayList<>(List.of(row)));

        assertThat(row).containsEntry("customerNo", "C100");
        assertThat(row).containsEntry("matchStatus", "matched");
        MapSqlParameterSource saved = captureFirstMatch();
        assertThat(saved.getValue("matchedBy")).isEqualTo("CRM_Sync");
        assertThat(saved.getValue("customerNo")).isEqualTo("C100");
    }

    @Test
    void 생일_월일이_스왑돼_있어도_동일인으로_인정한다() {
        // 실측 사례: CRM 이 1990-08-15 를 1990-15-08 로 잘못 저장한 경우.
        Map<String, Object> row = row(101L, "홍길동", "1990-08-15", "", "");
        when(repository.findCandidatesByNames(List.of("홍길동")))
                .thenReturn(List.of(customer("C101", "홍길동", "1990-15-08", "")));

        enricher.matchRows(new ArrayList<>(List.of(row)));

        assertThat(row).containsEntry("matchStatus", "matched");
        assertThat(row).containsEntry("customerNo", "C101");
    }

    // ── 2단계: 검사일 당일 내원자 + 이름 토큰 재정렬 ────────────────────

    @Test
    void 검사일_당일_내원자_중_이름_순서가_뒤바뀌어도_유일하면_매칭한다() {
        // 실측 사례: 시트 "Anujin Tsendsuren" ↔ CRM "TSENDSUREN ANUJIN" (성·이름 순서 반대).
        Map<String, Object> row = new HashMap<>();
        row.put("seq", 200L);
        row.put("name", "Anujin Tsendsuren");
        row.put("birthDate", "1988-01-02");   // 일부러 다르게 두어 이름 매칭 경로만 검증
        row.put("contact", "");
        row.put("email", "");
        row.put("examDate", "2026-08-15");
        row.put("surgeryDate", "");
        row.put("customerNo", "");
        // 1단계는 이름 정확일치가 아니므로 통과 못함.
        when(repository.findCandidatesByNames(List.of("Anujin Tsendsuren"))).thenReturn(List.of());
        when(repository.findExamDateCandidates(List.of("2026-08-15")))
                .thenReturn(List.of(examDateCandidate("C200", "TSENDSUREN ANUJIN", "1989-99-99", "2026-08-15")));

        enricher.matchRows(new ArrayList<>(List.of(row)));

        assertThat(row).containsEntry("matchStatus", "matched");
        assertThat(row).containsEntry("customerNo", "C200");
    }

    // ── 3단계: 전화·이메일 유일 + 생일 검증 ─────────────────────────────

    @Test
    void 전화번호_뒷_8자리가_유일하고_생일이_맞으면_매칭한다() {
        Map<String, Object> row = row(300L, "김서로",   "1985-03-20", "010-2222-3333", "");
        when(repository.findCandidatesByNames(List.of("김서로"))).thenReturn(List.of());
        when(repository.findCandidatesByPhoneOrEmail(any(), any()))
                .thenReturn(phones(customer("C300", "다른이름", "1985-03-20", "01022223333")));

        enricher.matchRows(new ArrayList<>(List.of(row)));

        assertThat(row).containsEntry("matchStatus", "matched");
        assertThat(row).containsEntry("customerNo", "C300");
    }

    @Test
    void 전화번호_유일하지만_생일이_다르면_확인필요로_보관한다() {
        Map<String, Object> row = row(301L, "김서로", "1985-03-20", "010-2222-3333", "");
        when(repository.findCandidatesByNames(any())).thenReturn(List.of());
        when(repository.findCandidatesByPhoneOrEmail(any(), any()))
                .thenReturn(phones(customer("C301", "다른이름", "1970-01-01", "01022223333")));

        enricher.matchRows(new ArrayList<>(List.of(row)));

        assertThat(row).containsEntry("matchStatus", "review");
        assertThat(row).containsEntry("candidateCustomerNo", "C301");
        assertThat((String) row.get("candidateReason")).contains("전화번호 일치").contains("생일 불일치");

        // matched 로 저장되면 안 되고, candidate 로 보관돼야 한다.
        verify(repository).saveMatches(new MapSqlParameterSource[0]);
        ArgumentCaptor<MapSqlParameterSource[]> candidates = ArgumentCaptor.forClass(MapSqlParameterSource[].class);
        verify(repository).saveCandidates(candidates.capture());
        assertThat(candidates.getValue()).hasSize(1);
        assertThat(candidates.getValue()[0].getValue("candidateNo")).isEqualTo("C301");
    }

    @Test
    void 국내_시트번호는_해외_CRM번호와_뒷자리가_겹쳐도_매칭하지_않는다() {
        // 시트 010-2222-3333 · CRM 은 해외 번호로 뒷자리만 겹치는 다른 사람.
        Map<String, Object> row = row(302L, "김서로", "1985-03-20", "010-2222-3333", "");
        when(repository.findCandidatesByNames(any())).thenReturn(List.of());
        when(repository.findCandidatesByPhoneOrEmail(any(), any()))
                .thenReturn(phones(customer("C302", "다른이름", "1985-03-20", "6512223333")));  // 싱가폴 번호

        enricher.matchRows(new ArrayList<>(List.of(row)));

        // 국내/해외 분리 규칙 때문에 유일 후보로도 안 잡힌다 → 매칭·후보 어디에도 저장 X.
        assertThat(row.get("customerNo")).isEqualTo("");
        assertThat(row.get("candidateCustomerNo")).isNull();
        verify(repository).saveMatches(new MapSqlParameterSource[0]);
        verify(repository).saveCandidates(new MapSqlParameterSource[0]);
    }

    @Test
    void 이메일이_유일하지만_생일_정보가_없으면_확인필요로_보관한다() {
        Map<String, Object> row = row(400L, "김이메일", "", "", "hello@example.com");
        Map<String, Object> emailCandidate = customer("C400", "다른이름", "", "");
        emailCandidate.put("email", "hello@example.com");
        when(repository.findCandidatesByNames(any())).thenReturn(List.of());
        when(repository.findCandidatesByPhoneOrEmail(any(), any()))
                .thenReturn(emails(emailCandidate));

        enricher.matchRows(new ArrayList<>(List.of(row)));

        assertThat(row).containsEntry("matchStatus", "review");
        assertThat(row).containsEntry("candidateCustomerNo", "C400");
        assertThat((String) row.get("candidateReason")).contains("이메일 일치").contains("생일 정보 없음");
    }

    // ── 매칭 실패 케이스 ──────────────────────────────────────────────

    @Test
    void 후보가_전혀_없으면_행을_건드리지_않는다() {
        Map<String, Object> row = row(500L, "없는사람", "1990-01-01", "010-9999-8888", "nomatch@x.com");
        when(repository.findCandidatesByNames(any())).thenReturn(List.of());
        when(repository.findCandidatesByPhoneOrEmail(any(), any())).thenReturn(noCandidates());

        enricher.matchRows(new ArrayList<>(List.of(row)));

        assertThat(row.get("customerNo")).isEqualTo("");
        assertThat(row.get("matchStatus")).isNull();  // 상태 컬럼도 건드리지 않는다 (조회 SQL 이 파생)
        assertThat(row.get("candidateCustomerNo")).isNull();
    }

    @Test
    void 이미_매칭된_행은_다시_판정하지_않는다() {
        // customerNo 가 이미 있으면 matchUnmatchedRows() 필터가 걸러내 조회 자체를 하지 않는다.
        Map<String, Object> matched = row(600L, "홍길동", "1990-08-15", "010-1111-2222", "");
        matched.put("customerNo", "C600");

        enricher.matchRows(new ArrayList<>(List.of(matched)));

        verifyNoInteractions(repository);
    }

    // ── enrichDetails: 상세 병합 규칙 ─────────────────────────────────

    @Test
    void 상세_병합에서_시트에_적힌_검사일_수술일은_덮어쓰지_않는다() {
        Map<String, Object> row = new HashMap<>();
        row.put("seq", 700L);
        row.put("customerNo", "C700");
        row.put("examDate", "2026-08-01");       // 시트 원본값 — 유지돼야 함
        row.put("surgeryDate", "");              // 비어 있으면 CRM 값으로 채운다

        Map<String, Object> detail = new HashMap<>();
        detail.put("customerNo", "C700");
        detail.put("status", "수술완료");
        detail.put("registeredDate", "2026-07-15");
        detail.put("examDate", "2026-08-99");     // CRM 값 (덮어쓰면 안 됨)
        detail.put("surgeryDate", "2026-08-20");
        detail.put("operationRight", "SMILE");
        detail.put("operationLeft", "SMILE");
        detail.put("dreamlens", "");
        when(repository.findCustomerDetails(List.of("C700"))).thenReturn(List.of(detail));

        enricher.enrichDetails(new ArrayList<>(List.of(row)));

        assertThat(row).containsEntry("examDate", "2026-08-01");     // 시트 값 보존
        assertThat(row).containsEntry("surgeryDate", "2026-08-20");   // 빈 값은 CRM 으로 채움
        assertThat(row).containsEntry("status", "수술완료");
        assertThat(row).containsEntry("operationRight", "SMILE");
    }

    // ── 테스트 헬퍼 ───────────────────────────────────────────────────

    private static Map<String, Object> row(long seq, String name, String birthDate, String contact, String email) {
        Map<String, Object> row = new HashMap<>();
        row.put("seq", seq);
        row.put("name", name);
        row.put("birthDate", birthDate);
        row.put("contact", contact);
        row.put("email", email);
        row.put("examDate", "");
        row.put("surgeryDate", "");
        row.put("customerNo", "");
        return row;
    }

    private static Map<String, Object> customer(String customerNo, String name, String birthDate, String contact) {
        Map<String, Object> customer = new HashMap<>();
        customer.put("customerNo", customerNo);
        customer.put("name", name);
        customer.put("birthDate", birthDate);
        customer.put("contact", contact);
        customer.put("email", "");
        return customer;
    }

    private static Map<String, Object> examDateCandidate(String customerNo, String name, String birthDate, String eventDate) {
        Map<String, Object> candidate = customer(customerNo, name, birthDate, "");
        candidate.put("eventDate", eventDate);
        return candidate;
    }

    private MapSqlParameterSource captureFirstMatch() {
        ArgumentCaptor<MapSqlParameterSource[]> captor = ArgumentCaptor.forClass(MapSqlParameterSource[].class);
        verify(repository).saveMatches(captor.capture());
        assertThat(captor.getValue()).isNotEmpty();
        return captor.getValue()[0];
    }

    @SafeVarargs
    private static PhoneEmailCandidates phones(Map<String, Object>... rows) {
        return new PhoneEmailCandidates(new ArrayList<>(List.of(rows)), new ArrayList<>());
    }

    @SafeVarargs
    private static PhoneEmailCandidates emails(Map<String, Object>... rows) {
        return new PhoneEmailCandidates(new ArrayList<>(), new ArrayList<>(List.of(rows)));
    }

    private static PhoneEmailCandidates noCandidates() {
        return new PhoneEmailCandidates(new ArrayList<>(), new ArrayList<>());
    }
}
