package com.bviit.analytics.batch.repository;

import com.bviit.analytics.common.util.SqlLoader;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.time.LocalDate;

/**
 * 마트별 마지막 성공 적재일 기록 — 감사(audit) 로그 용도.
 *
 * <p>모든 배치 잡은 매일 D-1 고정 범위로 실행되며, 다음 배치의 시작점을 결정할 때 이 값을 읽지 않는다
 * (즉 {@link #upsert} 만 사용된다). 원래 증분 처리(last_loaded_at + 1 ~ yesterday)를 상정한 인프라였으나
 * 현재 정책은 고정 범위 처리 + 성공 시각 기록이므로 실사용은 audit 로 축소되었다.
 *
 * <p><b>DB 테이블명 {@code batch_watermark} 는 초기 설계 이력</b> — Flyway V1 마이그레이션에서 생성됐고
 * 이름을 바꾸려면 별도 rename 마이그레이션이 필요해 유지한다.
 * 향후 증분 처리 정책으로 전환하려면 find 메서드를 다시 추가하면 된다.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class BatchSuccessLogRepository {

    private static final String UPSERT_SQL = SqlLoader.load("sql/mart/batch/upsert-batch-success-log.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    /**
     * 마트별 마지막 성공 적재 일자 기록. 배치 잡이 성공 커밋 직전에 호출한다.
     */
    public void upsert(String martName, LocalDate lastLoadedAt) {
        jdbc.update(UPSERT_SQL, new MapSqlParameterSource()
                .addValue("name", martName)
                .addValue("date", lastLoadedAt, Types.DATE));
    }
}
