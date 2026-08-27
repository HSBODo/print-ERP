package com.bviit.analytics.surgery.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

/**
 * 누적 안수 화면 응답 1행.
 *
 * <p>원천 {@code OPERATION_ACCUMULATED_EYE_COUNT} 를 화면 zod 계약(camelCase)에 맞춘 표현.
 * 한 사람 양안이면 R/L 각 1행으로 온다.
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AccumulatedEyeRow {
    /** 원천 UUID — 화면 key 로도 씀. */
    private final String id;
    /** 차트번호(CUST_NUM). BIGINT 원천이지만 문자열 계약이 프론트와 일관성 있어 String. */
    private final String custNum;
    private final String customName;
    private final String customPhone;
    private final String operationCategory;
    private final String operationCode;
    /** YYYY-MM-DD */
    private final String operationDate;
    private final long accumulatedEyeCount;
    /** 'R' | 'L' */
    private final String eyePosition;
    /** YYYY-MM-DD HH24:MI:SS */
    private final String createDate;
    /** YYYY-MM-DD HH24:MI:SS */
    private final String lastModifiedDate;
}
