DELETE FROM list_reoperation
 WHERE reop_date >= CAST(:from AS DATE)
   AND reop_date <= CAST(:to   AS DATE)
