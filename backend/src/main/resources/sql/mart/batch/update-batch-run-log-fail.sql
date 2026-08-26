UPDATE batch_run_log
   SET status = 'FAILED',
       finished_at = :finishedAt,
       duration_ms = EXTRACT(EPOCH FROM (:finishedAt - started_at)) * 1000,
       error_message = :err
 WHERE id = :id
