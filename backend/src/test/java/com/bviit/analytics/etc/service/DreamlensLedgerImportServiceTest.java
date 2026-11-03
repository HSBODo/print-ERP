package com.bviit.analytics.etc.service;

import com.bviit.analytics.etc.entity.DreamlensLedgerEntry;
import com.bviit.analytics.etc.repository.DreamlensLedgerDraftRepository;
import com.bviit.analytics.etc.repository.DreamlensLedgerRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 드림렌즈 장부 자동 초안 — 진료구분→매출 버킷 분기와 '사람 입력 보호' 규칙 검증.
 * 원천 수치는 2026-08-05 prod 실측(시드 장부 5명 대조)에서 가져온 값이다.
 */
class DreamlensLedgerImportServiceTest {

    private static Map<String, Object> row(String date, String custNo, String name,
                                           String visitTypeRaw, int lens, int treatment) {
        Map<String, Object> m = new HashMap<>();
        m.put("entryDate", date);
        m.put("customerNo", custNo);
        m.put("customerName", name);
        m.put("visitTypeRaw", visitTypeRaw);
        m.put("examiner", "권성현");
        m.put("lensRevenue", lens);
        m.put("lensListPrice", lens);          // 기본은 정가=실수납. 할인 케이스는 개별 테스트에서 덮는다.
        m.put("treatmentRevenue", treatment);
        return m;
    }

    @Test
    void 신규는_dlNew_버킷에_진료비는_treatment_에_들어간다() {
        DreamlensLedgerImportService.Draft d =
                DreamlensLedgerImportService.toDraft(row("2026-08-02", "2234528", "정준원", "D/L_신규", 1_000_000, 41_800));
        assertThat(d.visitType).isEqualTo("신규");
        assertThat(d.dlNew).isEqualTo(1_000_000);
        assertThat(d.dlRepurchase).isZero();
        assertThat(d.treatment).isEqualTo(41_800);
    }

    @Test
    void 할인_시_실수납은_매출_버킷에_정가는_참고_컬럼에_따로_담긴다() {
        // 김아인 실측: 정가 300,000 / 실수납 250,000 (prod 2026-08-01)
        Map<String, Object> r = row("2026-08-01", "2234498", "김아인", "D/L_신규", 250_000, 44_300);
        r.put("lensListPrice", 300_000);
        DreamlensLedgerImportService.Draft d = DreamlensLedgerImportService.toDraft(r);
        assertThat(d.dlNew).isEqualTo(250_000);        // 매출 = 실수납
        assertThat(d.listPrice).isEqualTo(300_000);    // 정가 = 참고 수집
    }

    @Test
    void FU_구매는_재구매_버킷이다() {
        DreamlensLedgerImportService.Draft d =
                DreamlensLedgerImportService.toDraft(row("2026-08-02", "2119358", "이서현", "D/L_FU", 1_000_000, 21_100));
        assertThat(d.visitType).isEqualTo("FU");
        assertThat(d.dlRepurchase).isEqualTo(1_000_000);
        assertThat(d.dlNew).isZero();
    }

    @Test
    void 하드와_MiSight_는_각자_버킷으로_간다() {
        DreamlensLedgerImportService.Draft hard =
                DreamlensLedgerImportService.toDraft(row("2026-07-31", "2217616", "진서희", "H/L_신규", 500_000, 0));
        assertThat(hard.visitType).isEqualTo("하드 신규");
        assertThat(hard.hlNew).isEqualTo(500_000);

        DreamlensLedgerImportService.Draft misight =
                DreamlensLedgerImportService.toDraft(row("2026-02-27", "2157455", "김지아", "MiSight_재구매", 300_000, 0));
        assertThat(misight.visitType).isEqualTo("MiSight 재구매");
        assertThat(misight.mRepurchase).isEqualTo(300_000);
    }

    @Test
    void 미지_진료구분은_원문을_유지하고_재구매_버킷에_둔다() {
        DreamlensLedgerImportService.Draft d =
                DreamlensLedgerImportService.toDraft(row("2026-08-02", "1", "홍길동", "D/L_기타신설", 10_000, 0));
        assertThat(d.visitType).isEqualTo("D/L_기타신설");
        assertThat(d.dlRepurchase).isEqualTo(10_000);
    }

    @Test
    void 사람이_입력한_행이_있으면_초안을_만들지_않는다() {
        DreamlensLedgerDraftRepository draftRepo = mock(DreamlensLedgerDraftRepository.class);
        DreamlensLedgerRepository ledgerRepo = mock(DreamlensLedgerRepository.class);
        DreamlensLedgerImportService service = new DreamlensLedgerImportService(draftRepo, ledgerRepo);

        LocalDate day = LocalDate.of(2026, 8, 2);
        when(draftRepo.findDraftRows(day, day))
                .thenReturn(List.of(row("2026-08-02", "2234528", "정준원", "D/L_신규", 1_000_000, 41_800)));

        DreamlensLedgerEntry manual = DreamlensLedgerEntry.builder()
                .entryDate(day).customerNo("2234528").source(DreamlensLedgerEntry.SOURCE_MANUAL).build();
        when(ledgerRepo.findByCustomerNoAndEntryDate("2234528", day)).thenReturn(List.of(manual));

        Map<String, Integer> stats = service.importRange(day, day);

        assertThat(stats).containsEntry("inserted", 0).containsEntry("skippedManual", 1);
        verify(ledgerRepo, never()).save(any());
    }

    @Test
    void AUTO_초안은_재적재_시_CRM_값으로_갱신되고_렌즈_스펙은_보존된다() {
        DreamlensLedgerDraftRepository draftRepo = mock(DreamlensLedgerDraftRepository.class);
        DreamlensLedgerRepository ledgerRepo = mock(DreamlensLedgerRepository.class);
        DreamlensLedgerImportService service = new DreamlensLedgerImportService(draftRepo, ledgerRepo);

        LocalDate day = LocalDate.of(2026, 8, 2);
        when(draftRepo.findDraftRows(day, day))
                .thenReturn(List.of(row("2026-08-02", "2234528", "정준원", "D/L_신규", 1_200_000, 41_800)));

        DreamlensLedgerEntry auto = DreamlensLedgerEntry.builder()
                .entryDate(day).customerNo("2234528").customerName("정준원")
                .rLensSpec("83-525-33")                       // 검안사가 이미 채운 물리 정보
                .dlNewRevenue(1_000_000)
                .source(DreamlensLedgerEntry.SOURCE_AUTO).build();
        when(ledgerRepo.findByCustomerNoAndEntryDate("2234528", day)).thenReturn(List.of(auto));

        Map<String, Integer> stats = service.importRange(day, day);

        assertThat(stats).containsEntry("refreshed", 1).containsEntry("inserted", 0);
        assertThat(auto.getDlNewRevenue()).isEqualTo(1_200_000);   // CRM 최신값 반영
        assertThat(auto.getLensListPrice()).isEqualTo(1_200_000);  // 정가도 함께 갱신
        assertThat(auto.getRLensSpec()).isEqualTo("83-525-33");    // 물리 정보는 보존
        verify(ledgerRepo, never()).save(any());
    }

    @Test
    void 자동_초안_시작일_이전_구간은_통째로_건너뛴다() {
        DreamlensLedgerDraftRepository draftRepo = mock(DreamlensLedgerDraftRepository.class);
        DreamlensLedgerRepository ledgerRepo = mock(DreamlensLedgerRepository.class);
        DreamlensLedgerImportService service = new DreamlensLedgerImportService(draftRepo, ledgerRepo);

        Map<String, Integer> stats =
                service.importRange(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 7, 31));

        assertThat(stats).containsEntry("inserted", 0);
        verify(draftRepo, never()).findDraftRows(any(), any());
    }

    @Test
    void 같은_고객_같은_날_원천_2행이면_첫_행만_쓴다() {
        DreamlensLedgerDraftRepository draftRepo = mock(DreamlensLedgerDraftRepository.class);
        DreamlensLedgerRepository ledgerRepo = mock(DreamlensLedgerRepository.class);
        DreamlensLedgerImportService service = new DreamlensLedgerImportService(draftRepo, ledgerRepo);

        LocalDate day = LocalDate.of(2026, 8, 2);
        when(draftRepo.findDraftRows(day, day)).thenReturn(List.of(
                row("2026-08-02", "2234528", "정준원", "D/L_신규", 1_000_000, 41_800),
                row("2026-08-02", "2234528", "정준원", "D/L_FU", 0, 0)));
        when(ledgerRepo.findByCustomerNoAndEntryDate("2234528", day)).thenReturn(List.of());
        when(ledgerRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Integer> stats = service.importRange(day, day);
        assertThat(stats).containsEntry("inserted", 1);
    }

    @Test
    void 사람이_수정하면_MANUAL_로_승격된다() {
        DreamlensLedgerEntry auto = DreamlensLedgerEntry.builder()
                .entryDate(LocalDate.of(2026, 8, 2)).customerNo("2234528")
                .source(DreamlensLedgerEntry.SOURCE_AUTO).build();
        assertThat(auto.isAutoDraft()).isTrue();

        auto.updateFrom(DreamlensLedgerEntry.builder()
                .entryDate(LocalDate.of(2026, 8, 2)).customerNo("2234528").rLensSpec("83-525-33").build(),
                LocalDateTime.now());

        assertThat(auto.isAutoDraft()).isFalse();
        assertThat(auto.getSource()).isEqualTo(DreamlensLedgerEntry.SOURCE_MANUAL);
    }
}
