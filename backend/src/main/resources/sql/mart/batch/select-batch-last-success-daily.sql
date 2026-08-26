SELECT target_to, finished_at
FROM batch_run_log
WHERE run_type = 'DAILY' AND status = 'SUCCESS'
ORDER BY finished_at DESC
LIMIT 1
