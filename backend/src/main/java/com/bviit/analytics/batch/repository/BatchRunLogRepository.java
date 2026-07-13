package com.bviit.analytics.batch.repository;

import com.bviit.analytics.batch.dto.BatchRunLog;
import com.bviit.analytics.common.util.SqlLoader;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * 배치 실행 이력 기록.
 *
 * 사용 패턴:
 *   long id = repo.start(job, RunType.DAILY, from, to);
 *   try {
 *      Map<String, Integer> tableStats = ... 실제 잡 실행 ...
 *      repo.success(id, tableStats);
 *   } catch (Exception e) {
 *      repo.fail(id, e.getMessage());
 *   }
 */
@Slf4j
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class BatchRunLogRepository {

    private static final String INSERT_SQL  = SqlLoader.load("sql/mart/insert-batch-run-log.sql");
    private static final String SUCCESS_SQL = SqlLoader.load("sql/mart/update-batch-run-log-success.sql");
    private static final String FAIL_SQL    = SqlLoader.load("sql/mart/update-batch-run-log-fail.sql");
    private static final String SELECT_RECENT_SQL = SqlLoader.load("sql/mart/select-batch-run-logs.sql");
    private static final TypeReference<Map<String, Integer>> TABLE_STATS_TYPE = new TypeReference<>() {};

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public long start(String jobName, BatchRunLog.RunType runType, LocalDate from, LocalDate to) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("jobName", jobName)
                .addValue("runType", runType.name())
                .addValue("from", from, Types.DATE)
                .addValue("to", to, Types.DATE)
                .addValue("startedAt", LocalDateTime.now());

        GeneratedKeyHolder holder = new GeneratedKeyHolder();
        jdbc.update(INSERT_SQL, params, holder, new String[]{"id"});
        return Objects.requireNonNull(holder.getKey(), "batch_run_log id").longValue();
    }

    public void success(long id, Map<String, Integer> tableStats) {
        int total = tableStats.values().stream().mapToInt(Integer::intValue).sum();
        jdbc.update(SUCCESS_SQL, new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("rows", total)
                .addValue("tableStats", writeJson(tableStats))
                .addValue("finishedAt", LocalDateTime.now()));
    }

    public void fail(long id, String errorMessage) {
        // 에러 메시지가 지나치게 길면 잘라서 저장 (스택트레이스 전체는 로그로)
        String truncated = errorMessage == null ? null
                : errorMessage.substring(0, Math.min(errorMessage.length(), 4000));
        jdbc.update(FAIL_SQL, new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("finishedAt", LocalDateTime.now())
                .addValue("err", truncated));
    }

    public List<BatchRunLog> findRecent(int limit) {
        return jdbc.query(SELECT_RECENT_SQL, new MapSqlParameterSource("limit", limit), (rs, i) -> {
            LocalDate from = rs.getObject("target_from", LocalDate.class);
            LocalDate to = rs.getObject("target_to", LocalDate.class);
            LocalDateTime finishedAt = rs.getObject("finished_at", LocalDateTime.class);
            Long duration = rs.getObject("duration_ms", Long.class);
            return BatchRunLog.builder()
                    .id(rs.getLong("id"))
                    .jobName(rs.getString("job_name"))
                    .runType(BatchRunLog.RunType.valueOf(rs.getString("run_type")))
                    .targetFrom(from)
                    .targetTo(to)
                    .status(BatchRunLog.Status.valueOf(rs.getString("status")))
                    .rowsUpserted(rs.getInt("rows_upserted"))
                    .tableStats(readJson(rs.getString("table_stats")))
                    .startedAt(rs.getObject("started_at", LocalDateTime.class))
                    .finishedAt(finishedAt)
                    .durationMs(duration)
                    .errorMessage(rs.getString("error_message"))
                    .build();
        });
    }

    private String writeJson(Map<String, Integer> tableStats) {
        if (tableStats == null || tableStats.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(tableStats);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize table_stats {}", tableStats, e);
            return null;
        }
    }

    private Map<String, Integer> readJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, TABLE_STATS_TYPE);
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse table_stats json: {}", json, e);
            return null;
        }
    }
}
