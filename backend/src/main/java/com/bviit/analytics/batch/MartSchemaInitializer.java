package com.bviit.analytics.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * 마트 메타 테이블(batch_run_log, batch_watermark) DDL을 애플리케이션 기동 시
 * IF NOT EXISTS로 실행한다. Flyway/Liquibase 도입 전까지의 임시 수단.
 *
 * 실제 마트 테이블(mart_*, list_*)은 각 도메인 PR에서 별도 V스크립트로 추가.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class MartSchemaInitializer implements org.springframework.beans.factory.InitializingBean {

    private final DataSource dataSource;

    @Override
    public void afterPropertiesSet() {
        applyScript("sql/mart/V1__batch_meta.sql");
        applyScript("sql/mart/V2__surgery_mart.sql");
        applyScript("sql/mart/V3__reservation_mart.sql");
    }

    private void applyScript(String classpathLocation) {
        try (Connection conn = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(conn, new ClassPathResource(classpathLocation));
            log.info("Applied mart schema: {}", classpathLocation);
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to apply mart schema: " + classpathLocation, e);
        }
    }
}
