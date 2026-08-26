DELETE FROM list_reservation_all
WHERE reserve_date >= CAST(:from AS DATE)
  AND reserve_date <= CAST(:to   AS DATE)
