package com.bviit.analytics.etc.config;

import com.bviit.analytics.etc.entity.DreamlensLedgerEntry;
import com.bviit.analytics.etc.repository.DreamlensLedgerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 드림렌즈 장부 초기 시드 — 표가 비어 있을 때만 D/L 장부 실데이터 10행을 넣는다.
 *
 * 스프레드시트 장부를 앱으로 옮기는 첫 단계라, 화면을 열었을 때 입력 형식을 바로 알 수 있게
 * 최근 실제 행을 담아둔다. 이후 입력은 화면에서 직접 한다.
 * 이미 행이 있으면 아무것도 하지 않으므로 재기동해도 사용자 입력을 덮어쓰지 않는다.
 *
 * 끄려면: app.dreamlens-ledger.seed-enabled=false
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DreamlensLedgerSeeder implements CommandLineRunner {

    private final DreamlensLedgerRepository repository;

    @Value("${app.dreamlens-ledger.seed-enabled:true}")
    private boolean seedEnabled;

    @Override
    public void run(String... args) {
        if (!seedEnabled || repository.count() > 0) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        List<DreamlensLedgerEntry> seed = sampleRows();
        seed.forEach(entry -> entry.stampCreated(now));
        repository.saveAll(seed);
        log.info("Seeded dreamlens_ledger with {} rows", seed.size());
    }

    /**
     * 원천: D/L 장부 스프레드시트 2026-07-04 ~ 2026-08-02 구간의 실제 행.
     *
     * 구매·배송(purchaseType)은 시트 원문이 아니라 표준 표기 5종으로 통일해 넣는다
     * (원문은 같은 뜻이 285가지로 흩어져 있어 집계·필터가 불가능하다).
     *   본원 재고구매 / 본원 배송(본원수령) / 본원 배송(택배발송) / 본원 대여렌즈 / 용품 구매
     */
    private List<DreamlensLedgerEntry> sampleRows() {
        return List.of(
                crt("2026-07-04", null, "2233121", "박수연", "한지희", "본원 재고구매",
                        "89-500-32", "89-500-32", "2026-07-11", 900_000, 0, 41_800),
                crt("2026-07-10", null, "2233386", "김선우", "손혜수", "본원 대여렌즈",
                        "84-525-33", "84-525-33", "2026-07-22", 700_000, 0, 40_400),
                tcrt("2026-07-22", null, "2028121", "조민아", "김태현", "본원 재고구매",
                        "93-550/600-33", "93-550/600-33", "2026-07-29", 0, 1_200_000, 21_900),
                crt("2026-07-22", "신규", "2233962", "이민정", "김태현", "본원 재고구매",
                        "84-525-34(11)", "83-525-34(11)", null, 900_000, 0, 40_400),
                crt("2026-07-22", "신규", "2233961", "이민준", "한지희", "본원 재고구매",
                        "82-525-33", "82-525-33", null, 900_000, 0, 40_400),
                crt("2026-07-29", "신규", "2234359", "심현보", "한지희", "본원 배송(택배발송)",
                        "86-525-33", "86-525-33", null, 1_000_000, 0, 40_400),
                crt("2026-07-30", "신규", "2234400", "이선준", "김태현", "본원 재고구매",
                        "88-550-33", "89-550-33", null, 1_000_000, 0, 30_400),
                crt("2026-07-30", "신규", "2234389", "조운서", "권형진", "본원 재고구매",
                        "90-550-33(11)", "91-550-33(11)", null, 1_000_000, 0, 40_400),
                misight("2026-08-01", "신규", "2234498", "김아인", "권형진", "본원 재고구매",
                        "-7.50", "-8.00", 300_000, 44_300),
                crt("2026-08-02", "신규", "2234528", "정준원", "권성현", "본원 재고구매",
                        "83-525-33", "83-525-33", null, 1_000_000, 0, 41_800)
        );
    }

    /** CRT 렌즈 행 — R=G, L=R 색상이 장부의 기본 표기. */
    private DreamlensLedgerEntry crt(String date, String visitType, String customerNo, String name,
                                     String examiner, String purchaseType,
                                     String rSpec, String lSpec, String returnDate,
                                     int dlNew, int dlRepurchase, int treatment) {
        return lens(date, visitType, customerNo, name, examiner, purchaseType,
                "CRT", null, rSpec, "G", "CRT", null, lSpec, "R", returnDate,
                dlNew, dlRepurchase, 0, treatment);
    }

    private DreamlensLedgerEntry tcrt(String date, String visitType, String customerNo, String name,
                                      String examiner, String purchaseType,
                                      String rSpec, String lSpec, String returnDate,
                                      int dlNew, int dlRepurchase, int treatment) {
        return lens(date, visitType, customerNo, name, examiner, purchaseType,
                "T-CRT", null, rSpec, "G", "T-CRT", null, lSpec, "R", returnDate,
                dlNew, dlRepurchase, 0, treatment);
    }

    /** Misight — 도수(BOX 3개입) 표기라 색상이 없고 매출은 M 신규로 잡힌다. */
    private DreamlensLedgerEntry misight(String date, String visitType, String customerNo, String name,
                                         String examiner, String purchaseType,
                                         String rPower, String lPower, int mNew, int treatment) {
        return lens(date, visitType, customerNo, name, examiner, purchaseType,
                "Misight", "3", rPower, null, "Misight", "3", lPower, null, null,
                0, 0, mNew, treatment);
    }

    private DreamlensLedgerEntry lens(String date, String visitType, String customerNo, String name,
                                      String examiner, String purchaseType,
                                      String rLensName, String rBox, String rSpec, String rColor,
                                      String lLensName, String lBox, String lSpec, String lColor,
                                      String returnDate,
                                      int dlNew, int dlRepurchase, int mNew, int treatment) {
        LocalDate parsedReturn = returnDate == null ? null : LocalDate.parse(returnDate);
        return DreamlensLedgerEntry.builder()
                .entryDate(LocalDate.parse(date))
                .visitType(visitType)
                .customerNo(customerNo)
                .customerName(name)
                .examiner(examiner)
                .purchaseType(purchaseType)
                .rLensName(rLensName).rBox(rBox).rLensSpec(rSpec).rColor(rColor).rReturnDate(parsedReturn)
                .lLensName(lLensName).lBox(lBox).lLensSpec(lSpec).lColor(lColor).lReturnDate(parsedReturn)
                .dlNewRevenue(dlNew)
                .dlRepurchaseRevenue(dlRepurchase)
                .mNewRevenue(mNew)
                .treatmentRevenue(treatment)
                .build();
    }
}
