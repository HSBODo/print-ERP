package com.bviit.analytics.batch;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 배치 스케줄러는 postgres-mart 프로파일에서만 활성화.
 * H2 기본(로컬) 프로파일에는 스케줄러 없음.
 */
@Configuration
@Profile("postgres-mart")
@EnableScheduling
public class BatchConfig {
}
