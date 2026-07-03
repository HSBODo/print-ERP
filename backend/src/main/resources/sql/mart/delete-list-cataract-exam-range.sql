DELETE FROM list_cataract_exam
WHERE exam_date >= CAST(:from AS DATE)
  AND exam_date <= CAST(:to   AS DATE)
