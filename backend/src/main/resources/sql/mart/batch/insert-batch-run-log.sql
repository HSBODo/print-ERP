INSERT INTO batch_run_log
    (job_name, run_type, target_from, target_to, status, started_at)
VALUES
    (:jobName, :runType, :from, :to, 'RUNNING', :startedAt)
