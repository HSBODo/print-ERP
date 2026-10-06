-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/accounting/select-vision-operations.sql
-- 이관 이력: 2026-09-30 A7.
--
-- 방언: OPERATIONDATA → raw.raw_crm_operationdata · EMPLOYEE → raw.raw_crm_employee
--       CstPrcSub → raw.raw_crm_cstprcsub · ISNULL → COALESCE · WITH(NOLOCK) 제거
SELECT LTRIM(RTRIM(o.cust_num))            AS "custNum",
       o.operation_date                    AS "operationDate",
       RTRIM(COALESCE(o.operationr, ''))   AS "procedureRight",
       RTRIM(COALESCE(o.operationl, ''))   AS "procedureLeft",
       COALESCE(d.emp_name, '')            AS "surgeon"
FROM raw.raw_crm_operationdata o
LEFT JOIN raw.raw_crm_employee d ON d.emp_num = o.operation_doc
WHERE EXISTS (SELECT 1 FROM raw.raw_crm_cstprcsub s
              WHERE s.cstcusnum = o.cust_num AND s.cstdte >= :from AND s.cstdte <= :to)
