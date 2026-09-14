package com.bviit.analytics.common.exception;

import java.io.Serial;

public class SnapshotLockedException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    public SnapshotLockedException(String message) {
        super(message);
    }
}
