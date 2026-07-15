package com.bviit.analytics.common.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import javax.sql.DataSource;

/**
 * 레거시 홈페이지 예약 소스 DataSource — 읽기 전용.
 *
 * 대상: 레거시 PHP 홈페이지(bnviit-homepage-admin-rebuild)의 온라인 예약 데이터.
 * 대시보드의 Postgres/MSSQL 과는 완전히 다른 시스템이라 별도 DataSource 로 붙인다.
 * 조회는 JdbcTemplate 만 쓴다 — JPA·트랜잭션·쓰기 없음(그래서 EntityManager 를 두지 않는다).
 *
 * <p><b>프로파일이 아니라 프로퍼티로 게이팅한다.</b> stats/mart DataSource 는 @Profile 로 묶여
 * 있어 H2(default) 프로파일에서는 존재하지 않지만, 이 소스는 외부 DB 가 아니라 파일 스냅샷도
 * 될 수 있어 프로파일과 무관하게 켤 수 있어야 한다. {@code legacy.datasource.url} 이 설정된
 * 경우에만 빈이 생기고, 없으면 Repository/Service 까지 함께 사라져 컨트롤러가 503 을 준다
 * (StatsPanelSupport.require 패턴과 동일).
 *
 * <p><b>빈 값 = 꺼짐.</b> {@code @ConditionalOnProperty} 를 쓰지 않는 이유가 있다 — 그쪽은 값이
 * 빈 문자열이어도 "존재함"으로 보고 빈을 만들어버린다. 그러면 .env 나 compose 에 빈 값을 두는
 * 순간 없는 경로로 DataSource 가 떠서 503 대신 500 이 난다. SpEL 로 공백까지 꺼짐 처리한다.
 *
 * <p><b>SQLite 읽기 전용</b> — URL 에 {@code ?open_mode=1}(SQLITE_OPEN_READONLY)을 붙여
 * 파일 레벨에서 읽기 전용으로 연다. Hikari 의 read-only 설정은 커넥션의 실제 open mode 와
 * 일치해야 한다(불일치 시 드라이버가 setReadOnly 에서 예외를 던진다) — 그래서 기본값을 true 로
 * 두고 URL 과 짝을 맞춘다. MariaDB 에서도 read-only 는 세션 읽기 전용이라 그대로 유효하다.
 *
 * <p><b>소스는 두 가지, 판별은 URL 로</b> — {@link LegacyDialect} 참조.
 * {@code jdbc:sqlite:} 스냅샷 파일(기본) / {@code jdbc:mariadb:} 운영 DB 직결(실시간).
 * 드라이버 클래스도 URL 에서 파생하므로 보통은 URL 과 계정만 설정하면 된다.
 */
@Configuration
@ConditionalOnExpression(LegacyDataSourceConfig.ENABLED_EXPRESSION)
public class LegacyDataSourceConfig {

    /**
     * 레거시 소스 활성화 조건 — url 이 없거나 비어 있으면 관련 빈을 모두 만들지 않는다.
     * Repository/Service 도 이 상수를 참조해 조건을 한 곳에서 관리한다.
     */
    public static final String ENABLED_EXPRESSION = "!'${legacy.datasource.url:}'.trim().isEmpty()";

    /** URL 에서 판별한 방언 — Repository 가 SQL 세트를, Service 가 live 여부를 여기서 가져간다. */
    @Bean("legacyDialect")
    public LegacyDialect legacyDialect(@Value("${legacy.datasource.url}") String url) {
        return LegacyDialect.of(url);
    }

    @Bean("legacyDataSource")
    public DataSource legacyDataSource(
            @Value("${legacy.datasource.url}") String url,
            @Value("${legacy.datasource.username:}") String username,
            @Value("${legacy.datasource.password:}") String password,
            @Value("${legacy.datasource.driver-class-name:}") String driverClassName,
            @Value("${legacy.datasource.hikari.maximum-pool-size:2}") int maxPoolSize,
            @Value("${legacy.datasource.hikari.read-only:true}") boolean readOnly,
            @Value("${legacy.datasource.hikari.connection-timeout:5000}") long connectionTimeout
    ) {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(url);
        // 미지정이면 URL 에서 파생한다 — URL 과 드라이버가 어긋날 여지를 없앤다.
        if (driverClassName.isBlank()) {
            driverClassName = LegacyDialect.of(url).driverClassName();
        }
        if (!username.isBlank()) {
            ds.setUsername(username);
        }
        if (!password.isBlank()) {
            ds.setPassword(password);
        }
        ds.setDriverClassName(driverClassName);
        ds.setMaximumPoolSize(maxPoolSize);
        ds.setReadOnly(readOnly);
        ds.setConnectionTimeout(connectionTimeout);
        ds.setPoolName("legacy-homepage");
        ds.setConnectionTestQuery("SELECT 1");
        return ds;
    }

    @Bean("legacyJdbcTemplate")
    public NamedParameterJdbcTemplate legacyJdbcTemplate(
            @Qualifier("legacyDataSource") DataSource legacyDataSource
    ) {
        return new NamedParameterJdbcTemplate(legacyDataSource);
    }
}
