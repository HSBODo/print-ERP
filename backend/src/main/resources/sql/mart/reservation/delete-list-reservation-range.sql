DELETE FROM list_reservation
WHERE registered_at >= CAST(:from AS DATE)
  AND registered_at <= CAST(:to   AS DATE)
