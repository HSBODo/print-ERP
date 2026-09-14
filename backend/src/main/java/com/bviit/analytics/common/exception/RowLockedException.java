package com.bviit.analytics.common.exception;

public class RowLockedException extends RuntimeException {

    public RowLockedException(String message) {
        super(message);
    }
}
