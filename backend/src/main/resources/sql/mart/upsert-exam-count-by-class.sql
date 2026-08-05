INSERT INTO mart_exam_count_by_class (yr, mo, motive_report, cnt, loaded_at)
VALUES (:yr, :mo, :motiveReport, :cnt, CURRENT_TIMESTAMP)
ON CONFLICT (yr, mo, motive_report) DO UPDATE SET
    cnt       = EXCLUDED.cnt,
    loaded_at = CURRENT_TIMESTAMP
