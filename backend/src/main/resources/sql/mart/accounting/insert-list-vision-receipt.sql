INSERT INTO list_vision_receipt (
    receipt_date, cust_num, seq, sub_seq, status,
    customer_name, customer_grade, surgery_date, surgeon, procedure_right, procedure_left, counselor,
    payment_method, card_company, acquirer, payment_mode, category, product_name,
    registered_by, registered_at, payment_memo,
    amount, taxable, exempt, item_amounts,
    loaded_at
) VALUES (
    CAST(:receiptDate AS DATE), :custNum, :seq, :subSeq, :status,
    :customerName, :customerGrade, :surgeryDate, :surgeon, :procedureRight, :procedureLeft, :counselor,
    :paymentMethod, :cardCompany, :acquirer, :paymentMode, :category, :productName,
    :registeredBy, :registeredAt, :paymentMemo,
    :amount, :taxable, :exempt, CAST(:itemAmounts AS JSONB),
    CURRENT_TIMESTAMP
)
