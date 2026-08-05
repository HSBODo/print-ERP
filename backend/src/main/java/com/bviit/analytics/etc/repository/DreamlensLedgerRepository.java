package com.bviit.analytics.etc.repository;

import com.bviit.analytics.etc.entity.DreamlensLedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

/**
 * 드림렌즈 장부 CRUD 리포지토리.
 * 화면이 직접 입력·수정하는 원천 데이터라 마트가 아닌 JPA 로 다룬다.
 */
public interface DreamlensLedgerRepository extends JpaRepository<DreamlensLedgerEntry, Long> {

    /** 최신 날짜가 위로. 같은 날짜면 나중에 입력한 행(큰 id)이 위로 온다. */
    List<DreamlensLedgerEntry> findByEntryDateBetweenOrderByEntryDateDescIdDesc(LocalDate from, LocalDate to);
}
