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
 * 트리플 DataSource — postgres-mart 프로파일 전용.
 *
 *   Postgres (@Primary) → JPA + 마트 조회 (mart_*, list_*) + User
 *   stats  (MSSQL)      → CRM SOFTCRM 직접연결 (배치 읽기)
 *   warehouse (Postgres RDS) → 신규 데이터 플랫폼 bnviit_datawarehouse (2026-09-23~)
 *
 * 이관 방침 — CRM 직접연결(stats) → 데이터 플랫폼(warehouse) 리포지토리 단위 점진 스위치.
 * 데이터 플랫폼이 미완성이라 전면 전환은 위험하므로 두 소스를 병렬 유지한다.
 *
 * 이관 대상 리포지토리는 두 JdbcTemplate 을 모두 주입받고
 *   dataPlatformEnabled ? warehouseJdbcTemplate : statsJdbcTemplate
 * 로 라우팅한다. 활성화는 `SPRING_PROFILES_ACTIVE=dev,data-platform`
 * (application-data-platform.yml 이 data-platform.enabled=true 를 켠다).
 *
 * SQL 도 두 개를 병렬 유지: sql/softcrm/<domain>/*.sql (MSSQL 원본) ·
 * sql/warehouse/<domain>/*.sql (Postgres 거울). 파일명 동일.
 *
 * 전 리포지토리가 이 이중 패턴으로 확보되고 데이터 플랫폼이 검증되면,
 * stats 빈·yml `stats.datasource.*`·env `STATS_DB_*`·jTDS 의존을 일괄 제거한다.
 * 정본 전략: docs/data-platform/migration-strategy.md.
 *
 * 배치는 stats 에서 읽어 Postgres 마트로 upsert/append. 클라이언트 조회는 Postgres만.
 * 관련 문서: docs/databatch/strategy.md
 */
@Configuration
@Profile("postgres-mart")
public class MartDataSourceConfig {

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
                .type(HikariDataSource.class)
                .build();
    }

    @Primary
    @Bean("martJdbcTemplate")
    public NamedParameterJdbcTemplate martJdbcTemplate(DataSource dataSource) {
        return new NamedParameterJdbcTemplate(dataSource);
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

    @Bean("warehouseDataSource")
    public DataSource warehouseDataSource(
            @Value("${warehouse.datasource.url}") String url,
            @Value("${warehouse.datasource.username}") String username,
            @Value("${warehouse.datasource.password}") String password,
            @Value("${warehouse.datasource.driver-class-name}") String driverClassName,
            @Value("${warehouse.datasource.hikari.maximum-pool-size:3}") int maxPoolSize,
            @Value("${warehouse.datasource.hikari.read-only:true}") boolean readOnly,
            @Value("${warehouse.datasource.hikari.connection-timeout:10000}") long connectionTimeout
    ) {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(url);
        ds.setUsername(username);
        ds.setPassword(password);
        ds.setDriverClassName(driverClassName);
        ds.setMaximumPoolSize(maxPoolSize);
        ds.setReadOnly(readOnly);
        ds.setConnectionTimeout(connectionTimeout);
        ds.setPoolName("warehouse-postgres");
        ds.setConnectionTestQuery("SELECT 1");
        return ds;
    }

    @Bean("warehouseJdbcTemplate")
    public NamedParameterJdbcTemplate warehouseJdbcTemplate(
            @Qualifier("warehouseDataSource") DataSource warehouseDataSource
    ) {
        return new NamedParameterJdbcTemplate(warehouseDataSource);
    }
}
