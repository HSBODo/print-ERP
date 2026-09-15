package com.bviit.analytics.accounting.service;

import com.bviit.analytics.accounting.dto.AccountingStatus;
import com.bviit.analytics.accounting.dto.MedicalMonthlyPoint;
import com.bviit.analytics.accounting.dto.VisionMonthlyPoint;
import com.bviit.analytics.accounting.repository.AccountingMartRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 회계 화면 조회 — Postgres 마트만 읽는다.
 *
 * <p>월 전체 행 적재가 완료된 월은 행에서 재집계하고, 나머지 월은 집계 마트를 읽는다.
 * 구분이 '전체' 가 아니면 구분 정보가 없는 집계 마트는 쓰지 않는다.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class AccountingMartQueryService implements AccountingReader {

    static final String CATEGORY_ALL = "전체";
    static final String CATEGORY_OUTPATIENT = "외래";
    static final String CATEGORY_INPATIENT = "입원";
    static final String CATEGORY_CATARACT = "백내장";
    private static final Set<String> CATEGORIES = Set.of(CATEGORY_ALL, CATEGORY_OUTPATIENT, CATEGORY_INPATIENT, CATEGORY_CATARACT);

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final TypeReference<Map<String, Long>> ITEM_AMOUNTS = new TypeReference<>() { };

    private final AccountingMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMedicalReceipts(String from, String to) {
        return martRepository.findMedicalReceipts(from, to);
    }

    @Override
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public List<MedicalMonthlyPoint> getMedicalMonthly(List<Integer> years, String category) {
        // 두 조회 사이 배치가 rows_complete를 전환해도 같은 스냅샷에서 월을 선택한다.
        String resolved = category == null || category.isBlank() ? CATEGORY_ALL : category;
        if (!CATEGORIES.contains(resolved)) {
            throw new IllegalArgumentException("category must be one of " + CATEGORIES);
        }
        List<MedicalMonthlyPoint> out = new ArrayList<>();
        String receiptType = switch (resolved) {
            case CATEGORY_OUTPATIENT, CATEGORY_INPATIENT -> resolved;
            default -> "";
        };
        out.addAll(martRepository.findMedicalMonthlyFromList(years, receiptType, CATEGORY_CATARACT.equals(resolved)));
        if (CATEGORY_ALL.equals(resolved)) {
            out.addAll(martRepository.findMedicalMonthly(years));
        }
        out.sort(Comparator.comparingInt(MedicalMonthlyPoint::year).thenComparingInt(MedicalMonthlyPoint::month));
        return out;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getVisionReceipts(String from, String to) {
        List<Map<String, Object>> rows = martRepository.findVisionReceipts(from, to);
        for (Map<String, Object> row : rows) {
            row.put("itemAmounts", parseItemAmounts(row.get("itemAmounts")));
        }
        return rows;
    }

    @Override
    @Transactional(readOnly = true)
    public List<VisionMonthlyPoint> getVisionMonthly(List<Integer> years) {
        return martRepository.findVisionMonthly(years);
    }

    @Override
    @Transactional(readOnly = true)
    public AccountingStatus getStatus() {
        return martRepository.findStatus();
    }

    private static Map<String, Long> parseItemAmounts(Object json) {
        if (json == null) return Map.of();
        try {
            return JSON.readValue(json.toString(), ITEM_AMOUNTS);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("list_vision_receipt.item_amounts 파싱 실패", e);
        }
    }
}
