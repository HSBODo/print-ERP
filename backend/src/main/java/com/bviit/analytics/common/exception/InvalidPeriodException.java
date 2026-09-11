package com.bviit.analytics.common.exception;

import java.io.Serial;

public class InvalidPeriodException extends IllegalArgumentException {

    @Serial
    private static final long serialVersionUID = 1L;

    public InvalidPeriodException(String message) {
        super(message);
    }

    public InvalidPeriodException(String message, Throwable cause) {
        super(message, cause);
    }
}
