DELETE FROM list_medical_receipt
WHERE receipt_date >= CAST(:from AS DATE)
  AND receipt_date <= CAST(:to   AS DATE)
