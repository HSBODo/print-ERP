package com.bviit.analytics.common.stats;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.exception.DataSourceUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StatsPanelSupportTest {

    @Test
    void requireWrapsRealPayload() {
        ResponseEntity<ApiResponse<String>> response = StatsPanelSupport.require(
                Optional.of("real"),
                service -> service + "-payload"
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).isEqualTo("real-payload");
    }

    @Test
    void requireThrowsDataSourceUnavailableWhenServiceIsEmpty() {
        assertThatThrownBy(() -> StatsPanelSupport.require(
                        Optional.<String>empty(),
                        service -> service
                ))
                .isInstanceOf(DataSourceUnavailableException.class)
                .hasMessageContaining("MSSQL");
    }

    @Test
    void requireDataReturnsRawPayloadWithoutApiWrapper() {
        String response = StatsPanelSupport.requireData(
                Optional.of("real"),
                service -> service + "-raw"
        );

        assertThat(response).isEqualTo("real-raw");
    }

    @Test
    void panelResponsesCarryLiveMeta() {
        assertThat(metaSource(StatsPanelSupport.require(
                Optional.of("svc"), s -> "d").getBody()))
                .isEqualTo(StatsResponseMeta.Source.LIVE);

        // 미연결(503) 예외는 UNAVAILABLE 메타를 담는다.
        assertThatThrownBy(() -> StatsPanelSupport.require(
                Optional.<String>empty(), s -> "d"))
                .isInstanceOf(DataSourceUnavailableException.class)
                .satisfies(e -> assertThat(
                        ((StatsResponseMeta) ((DataSourceUnavailableException) e).getMeta()).source())
                        .isEqualTo(StatsResponseMeta.Source.UNAVAILABLE));
    }

    private static StatsResponseMeta.Source metaSource(ApiResponse<?> body) {
        assertThat(body).isNotNull();
        assertThat(body.getMeta()).isInstanceOf(StatsResponseMeta.class);
        return ((StatsResponseMeta) body.getMeta()).source();
    }
}
