package com.bviit.analytics.etc.service;

import com.bviit.analytics.common.exception.InvalidPeriodException;
import com.bviit.analytics.etc.dto.DreamlensLedgerRequest;
import com.bviit.analytics.etc.dto.DreamlensLedgerRow;
import com.bviit.analytics.etc.entity.DreamlensLedgerEntry;
import com.bviit.analytics.etc.repository.DreamlensLedgerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 드림렌즈 장부 조회·입력·수정·삭제.
 */
@Service
@RequiredArgsConstructor
public class DreamlensLedgerService {

    private final DreamlensLedgerRepository repository;

    @Transactional(readOnly = true)
    public List<DreamlensLedgerRow> findRows(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new InvalidPeriodException("조회 시작일이 종료일보다 늦을 수 없습니다.");
        }
        return repository.findByEntryDateBetweenOrderByEntryDateDescIdDesc(from, to).stream()
                .map(DreamlensLedgerRow::from)
                .toList();
    }

    @Transactional
    public DreamlensLedgerRow create(DreamlensLedgerRequest request) {
        DreamlensLedgerEntry entry = request.toEntity();
        entry.stampCreated(LocalDateTime.now());
        return DreamlensLedgerRow.from(repository.save(entry));
    }

    @Transactional
    public DreamlensLedgerRow update(Long id, DreamlensLedgerRequest request) {
        DreamlensLedgerEntry entry = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("장부 행을 찾을 수 없습니다. id=" + id));
        entry.updateFrom(request.toEntity(), LocalDateTime.now());
        return DreamlensLedgerRow.from(entry);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("장부 행을 찾을 수 없습니다. id=" + id);
        }
        repository.deleteById(id);
    }
}
