SELECT EXTRACT(MONTH FROM inquiry_date::date)::int AS month,
       COUNT(*)::int AS inquiries,
       0::int AS exams,
       0::int AS surgeries
FROM overseas_marketing_sheet
WHERE inquiry_date ~ '^\d{4}-\d{2}-\d{2}$'
  AND inquiry_date BETWEEN :from AND :to
GROUP BY EXTRACT(MONTH FROM inquiry_date::date)
ORDER BY month
