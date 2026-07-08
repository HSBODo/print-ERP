UPDATE batch_run_log
   SET status = 'SUCCESS',
       rows_upserted = :rows,
       finished_at = :finishedAt,
       duration_ms = EXTRACT(EPOCH FROM (:finishedAt - started_at)) * 1000
 WHERE id = :id
