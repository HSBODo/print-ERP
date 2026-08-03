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
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * 드림렌즈 장부 조회·입력·수정·삭제.
 */
@Service
@RequiredArgsConstructor
public class DreamlensLedgerService {

    /**
     * 한 번에 조회할 수 있는 최대 구간(일). 장부는 20년치 2.4만 행이라 상한이 없으면
     * 전 구간 조회 시 응답이 18MB 를 넘고 엔티티도 전부 영속성 컨텍스트에 올라간다.
     * 1년(윤년 포함 366일)이면 연 단위 조회는 그대로 되고 사고성 전 구간 조회만 막힌다.
     */
    private static final long MAX_RANGE_DAYS = 366;

    private final DreamlensLedgerRepository repository;

    @Transactional(readOnly = true)
    public List<DreamlensLedgerRow> findRows(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new InvalidPeriodException("조회 시작일이 종료일보다 늦을 수 없습니다.");
        }
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        if (days > MAX_RANGE_DAYS) {
            throw new InvalidPeriodException(
                    "조회 구간은 최대 " + MAX_RANGE_DAYS + "일까지입니다. (요청: " + days + "일) 기간을 나눠 조회해주세요.");
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
