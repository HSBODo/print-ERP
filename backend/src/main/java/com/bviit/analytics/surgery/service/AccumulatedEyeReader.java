package com.bviit.analytics.surgery.service;

import com.bviit.analytics.surgery.dto.AccumulatedEyeRow;

import java.util.List;

/**
 * 누적 안수 리스트 조회 진입점.
 *
 * <p>다른 리스트 도메인과 동형: 마트에서 읽는 {@link AccumulatedEyeMartQueryService} 가 {@code @Primary}
 * 이고 컨트롤러는 {@code Optional<AccumulatedEyeReader>} 로 주입 — 마트 프로파일이 없으면 503.
 */
public interface AccumulatedEyeReader {
    /**
     * @param field 검색 대상 컬럼. 'all' 이면 4컬럼(이름·차트·전화·안수) 모두, 그 외는 해당 컬럼만.
     *              허용값: 'all' | 'name' | 'chart' | 'phone' | 'eyes'.
     */
    List<AccumulatedEyeRow> getAccumulatedEyes(String from, String to, String query, String field);

    /** 총 누적 안수 (마트 max). 홈 대시보드 KPI 용. */
    long getTotal();
}
