package com.bviit.analytics.batch.seed;

import com.bviit.analytics.batch.MartSchemaInitializer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 마트 시드 오케스트레이터.
 *
 * ApplicationReadyEvent 시점에 등록된 모든 {@link MartSeeder} 를 순회하며 seedIfMissing() 실행.
 * MartSchemaInitializer 이후에 돌도록 명시적 의존.
 *
 * 실패 정책: 한 seeder가 실패해도 다른 seeder는 계속 시도(로그만). 부팅은 실패시키지 않는다 —
 * 시드는 어차피 있어도/없어도 서비스 자체 기동은 가능해야 함.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class MartSeedRunner {

    // MartSchemaInitializer 를 의존해 스키마가 먼저 준비된 뒤 이 클래스가 생성되도록 강제.
    @SuppressWarnings("unused")
    private final MartSchemaInitializer schemaInitializer;

    private final List<MartSeeder> seeders;

    @EventListener(ApplicationReadyEvent.class)
    public void runAll() {
        if (seeders.isEmpty()) {
            log.info("MartSeedRunner: no seeders registered — skip");
            return;
        }
        log.info("MartSeedRunner: {} seeder(s) registered", seeders.size());
        for (MartSeeder seeder : seeders) {
            try {
                seeder.seedIfMissing();
                log.info("[seed] {} — done", seeder.name());
            } catch (Exception e) {
                // 시드 실패는 서비스 기동을 막지 않음. 알림은 별도 스코프.
                log.error("[seed] {} — failed", seeder.name(), e);
            }
        }
    }
}
