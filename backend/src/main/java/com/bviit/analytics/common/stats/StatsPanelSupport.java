package com.bviit.analytics.common.stats;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.exception.DataSourceUnavailableException;
import org.springframework.http.ResponseEntity;

import java.util.Optional;
import java.util.function.Function;

public final class StatsPanelSupport {

    private static final String REAL_DATA_UNAVAILABLE_MESSAGE = "실 데이터 소스(MSSQL)가 연결되지 않았습니다.";

    private StatsPanelSupport() {
    }

    public static <S, T> ResponseEntity<ApiResponse<T>> require(
            Optional<S> realService,
            Function<S, T> realFetcher
    ) {
        return realService
                .map(service -> ResponseEntity.ok(ApiResponse.ok(realFetcher.apply(service), StatsResponseMeta.live())))
                .orElseThrow(StatsPanelSupport::realDataUnavailable);
    }

    public static <S, T> T requireData(
            Optional<S> realService,
            Function<S, T> realFetcher
    ) {
        return realService
                .map(realFetcher)
                .orElseThrow(StatsPanelSupport::realDataUnavailable);
    }

    private static DataSourceUnavailableException realDataUnavailable() {
        return new DataSourceUnavailableException(REAL_DATA_UNAVAILABLE_MESSAGE, StatsResponseMeta.unavailable());
    }
}
