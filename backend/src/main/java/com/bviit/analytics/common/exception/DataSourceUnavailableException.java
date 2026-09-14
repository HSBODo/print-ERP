package com.bviit.analytics.common.exception;

import lombok.Getter;

import java.io.Serial;

@Getter
public class DataSourceUnavailableException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final Object meta;

    public DataSourceUnavailableException(String message) {
        this(message, null);
    }

    public DataSourceUnavailableException(String message, Object meta) {
        super(message);
        this.meta = meta;
    }
}
