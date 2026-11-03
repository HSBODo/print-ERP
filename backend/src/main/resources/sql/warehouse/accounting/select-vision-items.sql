-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/accounting/select-vision-items.sql
-- 이관 이력: 2026-09-30 A7.
--
-- 방언: PRCITMLST → raw.raw_crm_prcitmlst · CstPrcSub → raw.raw_crm_cstprcsub · WITH(NOLOCK) 제거
SELECT LTRIM(RTRIM(p.prccusnum)) AS "custNum",
       p.prcseq                  AS "seq",
       RTRIM(p.prccod)           AS "itemCode",
       RTRIM(p.prcitmcod)        AS "productName",
       p.prcitmqty * p.prcitmprc AS "amount"
FROM raw.raw_crm_prcitmlst p
WHERE EXISTS (SELECT 1 FROM raw.raw_crm_cstprcsub s
              WHERE s.cstcusnum = p.prccusnum AND s.cstseq = p.prcseq
                AND s.cstdte >= :from AND s.cstdte <= :to)
