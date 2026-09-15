DELETE FROM list_vision_receipt
WHERE receipt_date >= CAST(:from AS DATE)
  AND receipt_date <= CAST(:to   AS DATE)
