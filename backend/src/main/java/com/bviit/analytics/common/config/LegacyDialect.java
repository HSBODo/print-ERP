package com.bviit.analytics.common.config;

/**
 * 레거시 홈페이지 소스의 방언 — {@code legacy.datasource.url} 접두사로 판별한다.
 *
 * <p><b>왜 URL 로 판별하나.</b> 방언을 별도 설정 키로 두면 {@code jdbc:mariadb} + {@code dialect=sqlite}
 * 같은 모순된 조합이 만들어질 수 있다. URL 하나가 드라이버·SQL 세트·실시간 여부를 모두 결정하게 해
 * 어긋날 여지를 없앤다.
 *
 * <p>두 소스는 <b>같은 데이터를 다른 스키마로</b> 담고 있다 — 캐시가 원본을 snake_case 로 개명해
 * 적재했기 때문이다(C_NO→legacy_no, M_NM→name 등). 그래서 SQL 을 방언별로 나눠 둔다:
 * {@code sql/reservation-list-homepage/{sqlite|mariadb}/*.sql}. 결과 별칭 계약은 양쪽이 동일하다.
 */
public enum LegacyDialect {

    /** 로컬 SQLite 스냅샷 파일. 자격증명·터널 불필요. 데이터는 스냅샷 시점까지만(그 이후는 조용히 빈다). */
    SQLITE("sqlite", "org.sqlite.JDBC"),

    /** 레거시 운영 MariaDB 직결. 실시간이지만 SSH 터널 + 계정이 필요하다. */
    MARIADB("mariadb", "org.mariadb.jdbc.Driver");

    private final String sqlDir;
    private final String driverClassName;

    LegacyDialect(String sqlDir, String driverClassName) {
        this.sqlDir = sqlDir;
        this.driverClassName = driverClassName;
    }

    /** SQL 리소스 하위 디렉터리명 — sql/reservation-list-homepage/{sqlDir}/*.sql */
    public String sqlDir() {
        return sqlDir;
    }

    public String driverClassName() {
        return driverClassName;
    }

    /**
     * 실시간 소스인가.
     *
     * <p>화면의 '스냅샷 초과' 경고는 스냅샷일 때만 의미가 있다. 실시간에서는 마지막 등록일시가
     * 천장이 아니라 그냥 최근 등록건 시각이라, 미래 날짜로 조회하면 "집계되지 않았습니다"라는
     * 거짓 경고가 뜬다. 이 값을 화면에 내려보내 배너를 끈다.
     */
    public boolean live() {
        return this == MARIADB;
    }

    /** JDBC URL 접두사로 판별. 아는 접두사가 없으면 SQLITE(기존 기본 동작)로 본다. */
    public static LegacyDialect of(String jdbcUrl) {
        String url = jdbcUrl == null ? "" : jdbcUrl.trim().toLowerCase();
        return url.startsWith("jdbc:mariadb:") || url.startsWith("jdbc:mysql:")
                ? MARIADB
                : SQLITE;
    }
}
