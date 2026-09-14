package com.bviit.analytics.marketing.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 해외마케팅 CRM 매칭 자동 스케줄러 — 매일 새벽 3시(기본) 에 sync-crm 잡을 트리거한다.
 *
 * <p>기존에는 담당자가 [동기화] 버튼을 눌러야만 매칭·상세 병합이 실행됐다. 신규 접수가
 * 계속 review/received 상태로 남아 화면 신뢰도가 낮아지는 문제가 있어 정기 자동 실행을 도입.
 *
 * <p><b>정책 (2026-09-11 결정)</b>:
 * <ul>
 *   <li>기본 OFF (`overseas.crm-sync.scheduler-enabled=false`) — 도입 초기 안전장치로 명시적 opt-in.</li>
 *   <li>일 1회 03:00 (기본) — {@link com.bviit.analytics.batch.BatchOrchestrator#runDaily} 시각과 일치.
 *       두 잡이 순차 실행돼도 MSSQL 부하가 크게 겹치지 않음(마트 배치는 소스 조회, sync-crm 은 매칭·상세).</li>
 *   <li>문제 발생 시 env 로 즉시 중단 가능.</li>
 * </ul>
 *
 * <p><b>실행 방식</b>: {@link OverseasMarketingReader#syncCrm()} 는 ExecutorService 로 백그라운드
 * 잡을 시작하고 즉시 반환한다. 스케줄러 스레드는 잡 완료를 기다리지 않으며, 진행 상태는 서비스
 * 내부 로그(`[CRM동기화] ...`) 로 관측한다. 이미 실행 중이면 단일 실행 락으로 인해 새 잡이
 * 시작되지 않고 현재 상태만 반환된다(자연 스킵).
 *
 * <p><b>시트 동기화는 자동화하지 않는다</b> — 2026-09-09 이관 완료 후 수기 입력 위주라 자동 실행
 * 이득이 없다. 담당자가 필요 시 [시트 동기화] 버튼(ADMIN) 으로 수동 실행.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@ConditionalOnProperty(prefix = "overseas.crm-sync", name = "scheduler-enabled", havingValue = "true")
@RequiredArgsConstructor
public class OverseasCrmSyncScheduler {

    private final OverseasMarketingReader overseasMarketingReader;

    @Scheduled(cron = "${overseas.crm-sync.cron:0 0 3 * * *}", zone = "Asia/Seoul")
    public void runScheduledCrmSync() {
        log.info("[스케줄] 해외마케팅 CRM 동기화 잡 트리거 (진행은 [CRM동기화] 로그로 관측)");
        Map<String, Object> state = overseasMarketingReader.syncCrm();
        String phase = String.valueOf(state.getOrDefault("state", "unknown"));
        if ("running".equals(phase) && state.get("phase") == null) {
            log.info("[스케줄] 해외마케팅 CRM 동기화 잡 시작됨");
        } else {
            // 이미 실행 중이거나 (running with phase) 방금 완료된 상태
            log.info("[스케줄] 해외마케팅 CRM 동기화 상태: {}", state);
        }
    }
}
