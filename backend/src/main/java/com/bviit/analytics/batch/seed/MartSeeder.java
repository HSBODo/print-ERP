package com.bviit.analytics.batch.seed;

/**
 * 도메인별 마트 시드 컴포넌트가 구현하는 계약.
 *
 * 각 구현체는:
 *   - 자신의 마트 테이블에 이미 데이터가 있는지 판정하고
 *   - 없으면 시드 소스(예: backend/data/*.json)에서 읽어 삽입한다
 *
 * `seedIfMissing()`은 반드시 idempotent 해야 한다. 앱이 여러 번 재기동돼도 안전하도록:
 *   INSERT ... ON CONFLICT DO NOTHING
 * 또는 존재 검사 후 삽입 패턴을 사용.
 *
 * 구현체는 @Component + @Profile("postgres-mart")로 등록.
 * MartSeedRunner가 자동 픽업.
 */
public interface MartSeeder {

    /** 로그·모니터링용 짧은 이름 (예: "reservation-stats", "reservation-stats-cataract"). */
    String name();

    /** 마트 테이블에 시드 부재 시 삽입. 이미 있으면 no-op. */
    void seedIfMissing();
}
