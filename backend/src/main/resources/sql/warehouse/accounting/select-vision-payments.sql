-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/accounting/select-vision-payments.sql
-- 이관 이력: 2026-09-30 A7 (AccountingMartJob 배치 read-side · list_vision_receipt).
--
-- 방언 변환:
--   CstPrcSub → raw.raw_crm_cstprcsub · COSTPRICE → raw.raw_crm_costprice
--   CUSTOM → raw.raw_crm_custom · EMPLOYEE → raw.raw_crm_employee
--   ISNULL → COALESCE · WITH(NOLOCK) 제거
--   CONVERT(varchar(19), x, 120) → TO_CHAR(x, 'YYYY-MM-DD HH24:MI:SS')  (ODBC canonical 포맷)
--   [Level] (bracketed) → level  (예약어 아님, unquoted 가능)
--
-- ⚠️ alias 유지 (assembler 가 row.get("custNum") 등 case-sensitive 접근).
SELECT LTRIM(RTRIM(s.cstcusnum))                              AS "custNum",
       s.cstseq                                               AS "seq",
       s.cstsubseq                                            AS "subSeq",
       s.cstdte                                               AS "receiptDate",
       s.cstprc                                               AS "amount",
       COALESCE(s.cstpayway, '')                              AS "payWay",
       COALESCE(s.cstmaenam, '')                              AS "acquirerName",
       COALESCE(s.cstcrdcpn, '')                              AS "cardCode",
       COALESCE(s.cstpmsnum, '')                              AS "approvalNo",
       COALESCE(s.cstcnlynn, '')                              AS "cancelYn",
       TO_CHAR(s.cstregdte, 'YYYY-MM-DD HH24:MI:SS')          AS "registeredAt",
       TO_CHAR(s.cstmoddte, 'YYYY-MM-DD HH24:MI:SS')          AS "modifiedAt",
       COALESCE(e.emp_name, '')                               AS "registeredBy",
       COALESCE(c.cost_cardcp, '')                            AS "cardCompany",
       COALESCE(c.cost_memo, '')                              AS "paymentMemo",
       COALESCE(cu.cust_name, '')                             AS "customerName",
       COALESCE(cu.level, '')                                 AS "customerGrade",
       COALESCE(mc.emp_name, '')                              AS "counselor"
FROM raw.raw_crm_cstprcsub s
LEFT JOIN raw.raw_crm_costprice c ON c.cust_num = s.cstcusnum AND c.seq = s.cstseq
LEFT JOIN raw.raw_crm_custom   cu ON cu.cust_num = s.cstcusnum
LEFT JOIN raw.raw_crm_employee e  ON e.emp_num = s.cstempnum
LEFT JOIN raw.raw_crm_employee mc ON mc.emp_num = cu.my_counselor
WHERE s.cstdte >= :from AND s.cstdte <= :to
ORDER BY s.cstdte, s.cstcusnum, s.cstseq, s.cstsubseq
