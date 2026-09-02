package com.bviit.analytics.sms.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 자동 발송 배치(SmsDispatchJob) 파라미터 — 전부 env 로 조정. 기본은 안전한 값(off·소량).
 *
 * <p>운영 활성화 순서:
 * <ol>
 *   <li>{@code SMS_DISPATCH_ENABLED=true} — 스케줄러가 붙는다</li>
 *   <li>{@code SOLAPI_DRY_RUN=false} — 실제 API 호출</li>
 *   <li>템플릿 12슬롯이 준비된 그룹부터 문구 채움 — 미설정 슬롯은 조용히 skip</li>
 * </ol>
 */
@Component
@Getter
public class SmsDispatchProperties {

    /**
     * 배치 활성화 — 기본 false. 운영은 env 로 true 지정.
     * false 이면 스케줄러가 등록만 되고 조용히 skip 한다.
     */
    @Value("${sms.dispatch.enabled:false}")
    private boolean enabled;

    /** 한 폴링 사이클에 잡는 최대 큐 개수 (SKIP LOCKED LIMIT). */
    @Value("${sms.dispatch.batch-size:50}")
    private int batchSize;

    /** 하루 최대 발송량. DONE 카운트가 이 값을 넘으면 이후 사이클은 skip + Slack. */
    @Value("${sms.dispatch.daily-limit:500}")
    private int dailyLimit;

    /** 큐 행당 최대 재시도 횟수. 도달 시 FAILED 로 굳어 관리자 재실행 API 로만 되살아남. */
    @Value("${sms.dispatch.max-attempts:3}")
    private int maxAttempts;

    /** 광고톡 발송 허용 시(hour) 시작 — 정보통신망법상 광고성 21~08 금지. */
    @Value("${sms.dispatch.ad-window-start-hour:8}")
    private int adWindowStartHour;

    /** 광고톡 발송 허용 시(hour) 종료. */
    @Value("${sms.dispatch.ad-window-end-hour:20}")
    private int adWindowEndHour;

    /**
     * FAILED 큐 누적 카운트 임계치 — 초과 시 Slack 경고. 0 이하면 알림 비활성.
     * "상승 엣지" 판정이라 임계치 진입 시 한 번만 울리고, 관리자가 [실패 재실행] 으로 밑까지
     * 내리면 리셋된다. 실패는 [실패 재실행] 없이 자동 회복 안 되니 누적 카운트가 관리자용 신호로 자연스럽다.
     */
    @Value("${sms.dispatch.failed-alert-threshold:10}")
    private int failedAlertThreshold;
}
