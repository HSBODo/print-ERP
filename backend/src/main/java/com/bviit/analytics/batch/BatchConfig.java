package com.bviit.analytics.batch;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 배치 스케줄러는 postgres-mart 프로파일에서만 활성화.
 * 다른 프로파일(개발 H2, mssql 직결)에는 스케줄러 없음.
 */
@Configuration
@Profile("postgres-mart")
@EnableScheduling
public class BatchConfig {
}
