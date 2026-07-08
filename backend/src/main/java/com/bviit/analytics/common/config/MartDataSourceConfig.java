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
 *   MSSQL (stats)        → 배치 전용 (읽기) — CRM 원본에서 D-1 데이터 추출
 *
 * 배치는 stats(MSSQL)에서 읽어 Postgres 마트로 upsert/append. 클라이언트 조회는 Postgres만.
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
}
