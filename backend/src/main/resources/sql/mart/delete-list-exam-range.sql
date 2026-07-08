DELETE FROM list_exam
WHERE exam_date >= CAST(:from AS DATE)
  AND exam_date <= CAST(:to   AS DATE)
