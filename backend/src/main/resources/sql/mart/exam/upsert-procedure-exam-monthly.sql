INSERT INTO mart_procedure_exam_monthly (
    yr, mo,
    exam_count, one_day_exam_count, total,
    loaded_at
) VALUES (
    :yr, :mo,
    :examCount, :oneDayExamCount, :total,
    CURRENT_TIMESTAMP
)
ON CONFLICT (yr, mo) DO UPDATE SET
    exam_count          = EXCLUDED.exam_count,
    one_day_exam_count  = EXCLUDED.one_day_exam_count,
    total               = EXCLUDED.total,
    loaded_at           = CURRENT_TIMESTAMP
