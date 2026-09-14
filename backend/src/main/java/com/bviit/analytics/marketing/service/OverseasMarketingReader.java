package com.bviit.analytics.marketing.service;

import com.bviit.analytics.marketing.dto.OverseasMarketingReceptionQuery;
import com.bviit.analytics.marketing.dto.OverseasMarketingStatisticsResult;

import java.util.List;
import java.util.Map;

public interface OverseasMarketingReader {
    List<Map<String, Object>> getReceptions(OverseasMarketingReceptionQuery query);

    OverseasMarketingStatisticsResult getStatistics(int year, String granularity);

    /**
     * CRM 동기화 백그라운드 잡을 시작한다(단일 실행 락 — 이미 돌고 있으면 시작하지 않고 현재 상태 반환).
     * 진행·결과는 {@link #syncCrmStatus()}로 폴링한다.
     */
    Map<String, Object> syncCrm();

    /** CRM 동기화 잡의 현재 상태 — idle / running(단계·경과) / done(결과) / error(사유). */
    Map<String, Object> syncCrmStatus();

    /** CRM 고객번호 단건 조회 — 수동 매칭 팝업의 미리보기·검증용. 없으면 null. */
    Map<String, Object> findCrmCustomer(String customerNo);

    /** 담당자 수동 매칭 확정 — 저장 후 해당 행만 즉시 상세·비용 병합해 스냅샷까지 채운다. */
    Map<String, Object> confirmMatch(long rowNumber, String customerNo, String actor);
}
