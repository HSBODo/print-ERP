SELECT id, job_name, run_type, target_from, target_to, status,
       rows_upserted, started_at, finished_at, duration_ms, error_message
FROM batch_run_log
ORDER BY id DESC
LIMIT :limit
