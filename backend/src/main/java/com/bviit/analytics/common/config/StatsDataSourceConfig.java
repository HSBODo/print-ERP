package com.bviit.analytics.common.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import javax.sql.DataSource;

/**
 * 듀얼 DataSource — mssql 프로파일에서만 활성화.
 *
 *   H2 (@Primary)   → JPA EntityManager → User 테이블
 *   MSSQL (stats)    → JdbcTemplate      → RESERVATION 등
 */
@Configuration
@Profile("mssql")
public class StatsDataSourceConfig {

    /**
     * H2를 JPA 기본 DataSource로 강제 — auto-config 오버라이드.
     */
    @Primary
    @Bean
    @ConfigurationProperties("spring.datasource")
    public DataSourceProperties primaryDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Primary
    @Bean
    public DataSource dataSource() {
        return primaryDataSourceProperties()
                .initializeDataSourceBuilder()
                .type(com.zaxxer.hikari.HikariDataSource.class)
                .build();
    }

    @Bean("statsDataSource")
    public DataSource statsDataSource(
            @Value("${stats.datasource.url}") String url,
            @Value("${stats.datasource.username}") String username,
            @Value("${stats.datasource.password}") String password,
            @Value("${stats.datasource.driver-class-name}") String driverClassName,
            @Value("${stats.datasource.hikari.maximum-pool-size:3}") int maxPoolSize,
            @Value("${stats.datasource.hikari.read-only:true}") boolean readOnly,
            @Value("${stats.datasource.hikari.connection-timeout:10000}") long connectionTimeout
    ) {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(url);
        ds.setUsername(username);
        ds.setPassword(password);
        ds.setDriverClassName(driverClassName);
        ds.setMaximumPoolSize(maxPoolSize);
        ds.setReadOnly(readOnly);
        ds.setConnectionTimeout(connectionTimeout);
        ds.setPoolName("stats-mssql");
        ds.setConnectionTestQuery("SELECT 1");
        return ds;
    }

    @Bean("statsJdbcTemplate")
    public NamedParameterJdbcTemplate statsJdbcTemplate(
            @Qualifier("statsDataSource") DataSource statsDataSource
    ) {
        return new NamedParameterJdbcTemplate(statsDataSource);
    }
}
