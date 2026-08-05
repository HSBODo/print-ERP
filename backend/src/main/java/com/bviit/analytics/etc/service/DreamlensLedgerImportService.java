package com.bviit.analytics.etc.service;

import com.bviit.analytics.etc.entity.DreamlensLedgerEntry;
import com.bviit.analytics.etc.repository.DreamlensLedgerDraftRepository;
import com.bviit.analytics.etc.repository.DreamlensLedgerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 드림렌즈 장부 자동 초안 적재 — CRM 내원·수납 기록으로 초안 행을 만들어 두면
 * 검안사는 CRM 에 없는 렌즈 물리 정보(스펙·색상·BOX·반납일)와 리콜만 보완한다.
 *
 * 규칙 (전부 '사람 입력 보호' 방향):
 *   - (고객번호, 내원일) 이 upsert 키. 이미 MANUAL 행이 있으면 아무것도 안 한다.
 *   - AUTO 초안은 재적재 시 CRM 최신값으로 갱신되지만, 사람이 한 번 수정하면
 *     MANUAL 로 승격되어({@link DreamlensLedgerEntry#updateFrom}) 이후 배치가 덮지 않는다.
 *   - {@link #IMPORT_MIN_DATE} 이전은 적재하지 않는다 — 그 전 구간은 스프레드시트
 *     수기 장부가 원천이라, 광역 rerun 이 과거 초안을 대량 생성하는 사고를 막는다.
 *
 * 매출 버킷 분기는 진료구분(MEDICAL_SUB_CFG.SUB_NAME) 기준:
 *   D/L_신규→dlNew · D/L_재구매→dlRepurchase · D/L_FU 구매→dlRepurchase(FU구매)
 *   H/L_*→hl* · MiSight_*→m* · 그 외→dlRepurchase (초안이므로 검안사가 조정)
 *   ⚠️ 진료구분이 D/L_신규인데 MiSight 를 구매하는 경우(실측 존재)는 CRM 으로 구분 불가 —
 *   dlNew 로 초안이 잡히므로 검안사가 m 버킷으로 옮겨야 한다.
 */
@Slf4j
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class DreamlensLedgerImportService {

    /** 자동 초안 시작일 — 이전 구간은 수기 장부(스프레드시트)가 원천. */
    static final LocalDate IMPORT_MIN_DATE = LocalDate.of(2026, 8, 1);

    private final DreamlensLedgerDraftRepository draftRepository;
    private final DreamlensLedgerRepository ledgerRepository;

    /**
     * REQUIRES_NEW: 진료비 조회가 링크드서버(.240 IPLUS)를 타므로 원격 장애 시 여기만 실패한다.
     * 별도 트랜잭션으로 격리해 ETC 도메인의 다른 적재(B2B 매출)가 함께 롤백되지 않게 한다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Map<String, Integer> importRange(LocalDate from, LocalDate to) {
        LocalDate effectiveFrom = from.isBefore(IMPORT_MIN_DATE) ? IMPORT_MIN_DATE : from;
        if (effectiveFrom.isAfter(to)) {
            log.info("DreamlensLedgerImport skip: range {}..{} precedes min date {}", from, to, IMPORT_MIN_DATE);
            return Map.of("inserted", 0, "refreshed", 0, "skippedManual", 0);
        }

        List<Map<String, Object>> rows = draftRepository.findDraftRows(effectiveFrom, to);
        // 같은 고객이 같은 날 D 예약을 2건 잡으면 원천이 2행 → 첫 행만 쓴다(키 = 고객|날짜).
        Map<String, Map<String, Object>> dedup = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            dedup.putIfAbsent(str(row, "customerNo") + "|" + str(row, "entryDate"), row);
        }

        LocalDateTime now = LocalDateTime.now();
        int inserted = 0;
        int refreshed = 0;
        Set<String> skippedManual = new HashSet<>();

        for (Map<String, Object> row : dedup.values()) {
            String customerNo = str(row, "customerNo");
            LocalDate entryDate = LocalDate.parse(str(row, "entryDate"));

            List<DreamlensLedgerEntry> existing =
                    ledgerRepository.findByCustomerNoAndEntryDate(customerNo, entryDate);
            DreamlensLedgerEntry autoRow = existing.stream()
                    .filter(DreamlensLedgerEntry::isAutoDraft)
                    .findFirst()
                    .orElse(null);

            if (!existing.isEmpty() && autoRow == null) {
                skippedManual.add(customerNo + "|" + entryDate);   // 사람 입력 행 — 절대 안 건드림
                continue;
            }

            Draft draft = toDraft(row);
            if (autoRow != null) {
                autoRow.refreshDraft(draft.visitType, draft.customerName, draft.examiner,
                        draft.dlNew, draft.dlRepurchase, draft.mNew, draft.mRepurchase,
                        draft.hlNew, draft.hlRepurchase, draft.treatment, now);
                refreshed++;
            } else {
                DreamlensLedgerEntry entry = DreamlensLedgerEntry.builder()
                        .entryDate(entryDate)
                        .visitType(draft.visitType)
                        .customerNo(customerNo)
                        .customerName(draft.customerName)
                        .examiner(draft.examiner)
                        .dlNewRevenue(draft.dlNew)
                        .dlRepurchaseRevenue(draft.dlRepurchase)
                        .mNewRevenue(draft.mNew)
                        .mRepurchaseRevenue(draft.mRepurchase)
                        .hlNewRevenue(draft.hlNew)
                        .hlRepurchaseRevenue(draft.hlRepurchase)
                        .treatmentRevenue(draft.treatment)
                        .source(DreamlensLedgerEntry.SOURCE_AUTO)
                        .build();
                entry.stampCreated(now);
                ledgerRepository.save(entry);
                inserted++;
            }
        }

        Map<String, Integer> stats = Map.of(
                "inserted", inserted, "refreshed", refreshed, "skippedManual", skippedManual.size());
        log.info("DreamlensLedgerImport done: range={}..{} {}", effectiveFrom, to, stats);
        return stats;
    }

    /** 원천 1행 → 장부 초안 값. 진료구분으로 visitType 표기와 렌즈 매출 버킷을 정한다. */
    static Draft toDraft(Map<String, Object> row) {
        String raw = str(row, "visitTypeRaw");
        int lens = intVal(row, "lensRevenue");
        int treatment = intVal(row, "treatmentRevenue");

        Draft d = new Draft();
        d.customerName = str(row, "customerName");
        d.examiner = str(row, "examiner");
        d.treatment = treatment;

        switch (raw == null ? "" : raw.trim()) {
            case "D/L_신규" -> { d.visitType = "신규"; d.dlNew = lens; }
            case "D/L_재구매" -> { d.visitType = "재구매"; d.dlRepurchase = lens; }
            case "D/L_FU" -> { d.visitType = "FU"; d.dlRepurchase = lens; }   // FU 중 구매 = 재구매 매출
            case "H/L_신규" -> { d.visitType = "하드 신규"; d.hlNew = lens; }
            case "H/L_재구매" -> { d.visitType = "하드 재구매"; d.hlRepurchase = lens; }
            case "MiSight_신규" -> { d.visitType = "MiSight 신규"; d.mNew = lens; }
            case "MiSight_재구매" -> { d.visitType = "MiSight 재구매"; d.mRepurchase = lens; }
            case "MiSight_FU" -> { d.visitType = "MiSight FU"; d.mRepurchase = lens; }
            default -> { d.visitType = raw; d.dlRepurchase = lens; }   // 미지 유형 — 원문 유지, 검안사 조정
        }
        return d;
    }

    private static String str(Map<String, Object> row, String key) {
        Object v = row.get(key);
        return v == null ? null : v.toString().trim();
    }

    private static int intVal(Map<String, Object> row, String key) {
        Object v = row.get(key);
        return v instanceof Number n ? n.intValue() : 0;
    }

    /** 초안 값 홀더 — 서비스 내부 전용. */
    static final class Draft {
        String visitType;
        String customerName;
        String examiner;
        int dlNew;
        int dlRepurchase;
        int mNew;
        int mRepurchase;
        int hlNew;
        int hlRepurchase;
        int treatment;
    }
}
