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
 * 듀얼 DataSource — postgres-mart 프로파일 전용.
 *
 *   Postgres (@Primary) → JPA + 마트 조회 (mart_*, list_*) + User
 *   warehouse (Postgres RDS) → 데이터 플랫폼 bnviit_datawarehouse (raw.* 직결 조회)
 *
 * 통계 리포지토리는 warehouseJdbcTemplate 하나만 주입받아 조회한다.
 * 관련 문서: docs/databatch/strategy.md · docs/data-platform/migration-strategy.md
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
