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
        /**
         * dry-run 로 처리된 발송인지 (실 솔라피 API 호출 없음).
         * SmsDispatchJob 이 이걸 보고 큐를 RECEIVED 대신 DONE 으로 곧바로 굳힌다 — 웹훅이 안 오는
         * 흐름이라 RECEIVED 에 두면 완결되지 않기 때문.
         */
        private final boolean dryRun;
    }

    private final int requested;
    private final int success;
    private final int failed;
    private final int skipped;
    private final List<Item> items;
}
