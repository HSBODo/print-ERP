INSERT INTO list_medical_receipt (
    receipt_date, receipt_type, chart_no, serial_no, row_seq,
    patient_name, insurance_type, doctor, receipt_staff, receipt_time, room, revenue_type,
    status, closed,
    hundred_copay, hundred_unpaid, salary_total, claim_amount, copay, non_covered, total_copay,
    welfare_support, disabled_support, support_amount, health_living_expense,
    actual_paid, outstanding, discount, discount_reason,
    card, cash, transfer,
    refund, outstanding_occurred, outstanding_recovered,
    outstanding_card, outstanding_cash, outstanding_transfer, refund_occurred, cash_receipt,
    loaded_at
) VALUES (
    CAST(:receiptDate AS DATE), :receiptType, :chartNo, :serialNo, :rowSeq,
    :patientName, :insuranceType, :doctor, :receiptStaff, :receiptTime, :room, :revenueType,
    :status, :closed,
    :hundredCopay, :hundredUnpaid, :salaryTotal, :claimAmount, :copay, :nonCovered, :totalCopay,
    :welfareSupport, :disabledSupport, :supportAmount, :healthLivingExpense,
    :actualPaid, :outstanding, :discount, :discountReason,
    :card, :cash, :transfer,
    :refund, :outstandingOccurred, :outstandingRecovered,
    :outstandingCard, :outstandingCash, :outstandingTransfer, :refundOccurred, :cashReceipt,
    CURRENT_TIMESTAMP
)
