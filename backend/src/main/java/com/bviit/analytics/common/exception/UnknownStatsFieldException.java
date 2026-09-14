package com.bviit.analytics.common.exception;

import java.io.Serial;

public class UnknownStatsFieldException extends IllegalArgumentException {

    @Serial
    private static final long serialVersionUID = 1L;

    public UnknownStatsFieldException(String message) {
        super(message);
    }
}
