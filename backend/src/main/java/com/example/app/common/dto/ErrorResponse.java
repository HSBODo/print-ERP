package com.example.app.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {

    private final boolean success = false;
    private final int status;
    private final String message;
    private final Map<String, String> errors;
    private final Object meta;
    private final String timestamp;

    private ErrorResponse(int status, String message, Map<String, String> errors) {
        this(status, message, errors, null);
    }

    private ErrorResponse(int status, String message, Map<String, String> errors, Object meta) {
        this.status = status;
        this.message = message;
        this.errors = errors;
        this.meta = meta;
        this.timestamp = ZonedDateTime.now(ZoneId.of("Asia/Seoul"))
                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }

    public static ErrorResponse of(int status, String message) {
        return new ErrorResponse(status, message, null);
    }

    public static ErrorResponse of(int status, String message, Map<String, String> errors) {
        return new ErrorResponse(status, message, errors);
    }

    public static ErrorResponse of(int status, String message, Object meta) {
        return new ErrorResponse(status, message, null, meta);
    }
}
