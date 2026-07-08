package com.bviit.analytics.common.stats;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 통계 API 공통 응답 메타데이터.
 *
 * 숫자 자체와 별개로, 어떤 출처(스냅샷/라이브/미연결)·스키마·공식 버전에서 온 응답인지 명시한다.
 * 예약통계처럼 스냅샷 기반 API는 모든 필드를 채우고, 라이브 전용 패널 API는 출처(source)만 채운다
 * (period/schemaVersion/locked 등은 NON_NULL로 생략).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record StatsResponseMeta(
        Source source,
        String period,
        Integer schemaVersion,
        String formulaVersion,
        Boolean locked,
        String confirmedAt,
        String confirmedBy
) {
    public enum Source {
        SNAPSHOT,
        LIVE,
        MART,
        UNAVAILABLE
    }

    /** 스냅샷(확정/PDF) 출처 — 전체 메타 채움. */
    public static StatsResponseMeta snapshot(
            String period,
            String formulaVersion,
            boolean locked,
            String confirmedAt,
            String confirmedBy,
            int schemaVersion
    ) {
        return new StatsResponseMeta(
                Source.SNAPSHOT,
                period,
                schemaVersion,
                formulaVersion,
                locked,
                confirmedAt,
                confirmedBy
        );
    }

    /** 라이브 집계 출처(기간/공식/스키마 컨텍스트 있음). */
    public static StatsResponseMeta live(String period, String formulaVersion, int schemaVersion) {
        return new StatsResponseMeta(
                Source.LIVE,
                period,
                schemaVersion,
                formulaVersion,
                false,
                null,
                null
        );
    }

    /** 마트(D-1 배치 적재) 출처 — 매일 03:00 배치가 채워둔 Postgres 마트에서 조회. */
    public static StatsResponseMeta mart(String period, String formulaVersion, int schemaVersion) {
        return new StatsResponseMeta(
                Source.MART,
                period,
                schemaVersion,
                formulaVersion,
                false,
                null,
                null
        );
    }

    /** 미연결(503) 출처(기간/공식/스키마 컨텍스트 있음). */
    public static StatsResponseMeta unavailable(String period, String formulaVersion, int schemaVersion) {
        return new StatsResponseMeta(
                Source.UNAVAILABLE,
                period,
                schemaVersion,
                formulaVersion,
                null,
                null,
                null
        );
    }

    /** 라이브 패널(기간/스냅샷 컨텍스트 없는 연도기반 패널 API)용 — 출처만. */
    public static StatsResponseMeta live() {
        return new StatsResponseMeta(Source.LIVE, null, null, null, false, null, null);
    }

    /** 라이브 패널 미연결(503)용 — 출처만. */
    public static StatsResponseMeta unavailable() {
        return new StatsResponseMeta(Source.UNAVAILABLE, null, null, null, null, null, null);
    }
}
