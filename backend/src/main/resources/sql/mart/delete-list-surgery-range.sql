DELETE FROM list_surgery
 WHERE surgery_date >= CAST(:from AS DATE)
   AND surgery_date <= CAST(:to   AS DATE)
