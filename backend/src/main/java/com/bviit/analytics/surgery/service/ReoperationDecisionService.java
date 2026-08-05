package com.bviit.analytics.surgery.service;

import com.bviit.analytics.common.exception.InvalidPeriodException;
import com.bviit.analytics.surgery.dto.ReoperationDecisionRow;
import com.bviit.analytics.surgery.dto.ReoperationDecisionSaveRequest;
import com.bviit.analytics.surgery.entity.ReoperationDecision;
import com.bviit.analytics.surgery.repository.ReoperationDecisionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * 재수술 검토 판정 조회·저장.
 *
 * 저장은 배치 upsert 만 제공한다 — 재수술 검토 모달이 화면 상태 전체를 한 번에 넘긴다.
 * (chartNo, opDate) 유니크 기준으로 있으면 갱신, 없으면 신규 저장.
 */
@Service
@RequiredArgsConstructor
public class ReoperationDecisionService {

    private static final long MAX_RANGE_DAYS = 366;

    private final ReoperationDecisionRepository repository;

    @Transactional(readOnly = true)
    public List<ReoperationDecisionRow> findRows(LocalDate from, LocalDate to) {
        validateRange(from, to);
        return repository.findByOpDateBetween(from, to).stream()
                .map(ReoperationDecisionRow::from)
                .toList();
    }

    @Transactional
    public List<ReoperationDecisionRow> saveBatch(ReoperationDecisionSaveRequest request, String updatedBy) {
        LocalDateTime now = LocalDateTime.now();
        return request.getDecisions().stream()
                .map(item -> upsert(item, now, updatedBy))
                .map(ReoperationDecisionRow::from)
                .toList();
    }

    private ReoperationDecision upsert(
            ReoperationDecisionSaveRequest.Item item,
            LocalDateTime now,
            String updatedBy
    ) {
        String againR = item.getAgainR();
        String againL = item.getAgainL();
        return repository.findByChartNoAndOpDateAndAgainRAndAgainL(
                        item.getChartNo(), item.getOpDate(), againR, againL)
                .map(existing -> {
                    existing.applyDecision(item.getIsReoperation(), item.getMemo(), now, updatedBy);
                    return existing;
                })
                .orElseGet(() -> {
                    ReoperationDecision entry = ReoperationDecision.builder()
                            .chartNo(item.getChartNo())
                            .opDate(item.getOpDate())
                            .againR(againR)
                            .againL(againL)
                            .isReoperation(item.getIsReoperation())
                            .memo(item.getMemo())
                            .build();
                    entry.stampCreated(now, updatedBy);
                    return repository.save(entry);
                });
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new InvalidPeriodException("조회 시작일이 종료일보다 늦을 수 없습니다.");
        }
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        if (days > MAX_RANGE_DAYS) {
            throw new InvalidPeriodException(
                    "조회 구간은 최대 " + MAX_RANGE_DAYS + "일까지입니다. (요청: " + days + "일)");
        }
    }
}
