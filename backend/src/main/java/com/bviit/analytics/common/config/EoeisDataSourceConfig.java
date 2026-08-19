package com.bviit.analytics.common.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import javax.sql.DataSource;

/** 아이리더 검사기록 MSSQL 전용 읽기 연결. URL이 비어 있으면 관련 빈을 만들지 않는다. */
@Configuration
@ConditionalOnExpression(EoeisDataSourceConfig.ENABLED_EXPRESSION)
public class EoeisDataSourceConfig {

    public static final String ENABLED_EXPRESSION = "!'${eoeis.datasource.url:}'.trim().isEmpty()";

    @Bean("eoeisDataSource")
    public DataSource eoeisDataSource(
            @Value("${eoeis.datasource.url}") String url,
            @Value("${eoeis.datasource.username}") String username,
            @Value("${eoeis.datasource.password}") String password,
            @Value("${eoeis.datasource.hikari.maximum-pool-size:2}") int maxPoolSize,
            @Value("${eoeis.datasource.hikari.connection-timeout:8000}") long connectionTimeout
    ) {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(url);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        dataSource.setDriverClassName("net.sourceforge.jtds.jdbc.Driver");
        dataSource.setMaximumPoolSize(maxPoolSize);
        dataSource.setReadOnly(true);
        dataSource.setConnectionTimeout(connectionTimeout);
        dataSource.setPoolName("eoeis-mssql");
        dataSource.setConnectionTestQuery("SELECT 1");
        return dataSource;
    }

    @Bean("eoeisJdbcTemplate")
    public NamedParameterJdbcTemplate eoeisJdbcTemplate(
            @Qualifier("eoeisDataSource") DataSource dataSource
    ) {
        return new NamedParameterJdbcTemplate(dataSource);
    }
}
