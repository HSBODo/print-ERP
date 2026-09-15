package com.bviit.analytics.batch.job;

import com.bviit.analytics.accounting.repository.VisionReceiptSourceRepository;
import com.bviit.analytics.accounting.service.MedicalReceiptImportService;
import com.bviit.analytics.accounting.service.VisionReceiptAssembler;
import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 회계 도메인 마트 적재 잡 — 시력교정 매출(SOFTCRM) + 진료 수납(의사랑 링크드서버).
 *
 * <p>범위 = <b>수납일</b>. 두 리스트 마트는 그 범위를 delete+insert 하고, 진료 월집계는 범위가 걸친 달을 통째로 upsert 한다.
 * 초기 백필은 관리자 수동 실행으로 시력교정 2023-01-01~, 진료 2023-01-01~(행은 2026-01-01 부터 실림) 을 월 단위로 나눠 돌린다.
 *
 * <p>트랜잭션: 시력교정 적재 + 성공 로그는 이 트랜잭션(all-or-nothing). 진료 수납은 링크드서버(.240 IPLUS) 의존이라
 * {@link MedicalReceiptImportService} 가 REQUIRES_NEW 로 따로 커밋하고, 실패해도 시력교정 적재는 살린다
 * (EtcMartJob 의 드림렌즈 초안과 같은 구조). 실패는 table_stats 의 list_medical_receipt_failed=1 로 관측한다.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class AccountingMartJob {

    static final String MART_NAME = "accounting";

    private final VisionReceiptSourceRepository visionSourceRepository;
    private final AccountingMartWriter writer;
    private final MedicalReceiptImportService medicalReceiptImportService;
    private final BatchSuccessLogRepository successLogRepository;

    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("AccountingMartJob start: receipt range={}..{}", from, to);
        Map<String, Integer> stats = new LinkedHashMap<>();

        VisionReceiptAssembler.Result vision = VisionReceiptAssembler.assemble(
                visionSourceRepository.findPayments(from, to),
                visionSourceRepository.findItemDetails(from, to),
                visionSourceRepository.findItemFallbacks(from, to),
                visionSourceRepository.findOperations(from, to));
        stats.put("list_vision_receipt", writer.replaceVisionReceipts(from, to, vision.rows()));
        stats.put("vision_no_item", vision.stats().getOrDefault("no_item", 0));
        stats.put("vision_ratio_adjusted", vision.stats().getOrDefault("ratio_adjusted", 0));
        if (!vision.unknownCodes().isEmpty()) {
            // 매핑에 없는 PrcCod 는 미분류로 실렸다 — 카탈로그(VisionItemCatalog) 보강 신호.
            log.warn("vision receipts unmapped PrcCod: {}", vision.unknownCodes());
        }

        try {
            stats.putAll(medicalReceiptImportService.importRange(from, to));
        } catch (RuntimeException e) {
            // 링크드서버 장애 등 — 진료 수납만 건너뛰고 배치는 성공 처리. Slack 은 log.error 로 받는다.
            log.error("MedicalReceiptImport failed (skipped, vision load kept): {}", e.getMessage(), e);
            stats.put("list_medical_receipt_failed", 1);
        }

        successLogRepository.upsert(MART_NAME, to);
        log.info("AccountingMartJob done: {}", stats);
        return stats;
    }
}
