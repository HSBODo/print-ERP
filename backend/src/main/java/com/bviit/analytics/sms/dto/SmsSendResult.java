package com.bviit.analytics.sms.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/** 발송 실행 결과 — 대상별 성공/실패/건너뜀과 요약 건수. */
@Getter
@Builder
public class SmsSendResult {

    @Getter
    @Builder
    public static class Item {
        private final Long targetId;
        private final String name;
        /** SUCCESS / FAILED / SKIPPED */
        private final String result;
        private final String detail;
    }

    private final int requested;
    private final int success;
    private final int failed;
    private final int skipped;
    private final List<Item> items;
}
