-- 시력교정 매출 내역 — 수납일 범위. 매출 집계(피벗) 도 같은 행을 받아 화면에서 접는다.
SELECT
    cust_num || '-' || seq || '-' || sub_seq || '-' || CASE WHEN status = '결제취소' THEN 'C' ELSE 'P' END AS "id",
    TO_CHAR(receipt_date, 'YYYY-MM-DD') AS "receiptDate",
    cust_num                             AS "chartNo",
    customer_name                        AS "patientName",
    customer_grade                       AS "customerGrade",
    surgery_date                         AS "surgeryDate",
    surgeon                              AS "surgeon",
    procedure_right                      AS "procedureRight",
    procedure_left                       AS "procedureLeft",
    counselor                            AS "counselor",
    status                               AS "status",
    payment_method                       AS "paymentMethod",
    card_company                         AS "cardCompany",
    acquirer                             AS "acquirer",
    payment_mode                         AS "paymentMode",
    category                             AS "category",
    product_name                         AS "productName",
    registered_by                        AS "registeredBy",
    registered_at                        AS "registeredAt",
    payment_memo                         AS "paymentMemo",
    amount                               AS "amount",
    taxable                              AS "taxable",
    exempt                               AS "exempt",
    item_amounts::TEXT                   AS "itemAmounts"
FROM list_vision_receipt
WHERE receipt_date >= CAST(:from AS DATE)
  AND receipt_date <= CAST(:to   AS DATE)
-- status ASC: '결제처리' 가 '결제취소' 앞에 온다 (원행 다음에 취소행 · 원형과 같은 순서)
ORDER BY receipt_date, cust_num, seq, sub_seq, status
