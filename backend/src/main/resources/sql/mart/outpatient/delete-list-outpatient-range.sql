DELETE FROM list_outpatient
WHERE reserve_date >= CAST(:from AS DATE)
  AND reserve_date <= CAST(:to   AS DATE)
