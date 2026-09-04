package com.bviit.analytics.common.exception;

import java.io.Serial;

public class SqlResourceLoadException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    public SqlResourceLoadException(String message, Throwable cause) {
        super(message, cause);
    }
}
