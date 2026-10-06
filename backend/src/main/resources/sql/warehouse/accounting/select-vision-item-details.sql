-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/accounting/select-vision-item-details.sql
-- 이관 이력: 2026-09-30 A7.
--
-- 방언: PrcItmDtl → raw.raw_crm_prcitmdtl · CstPrcSub → raw.raw_crm_cstprcsub · WITH(NOLOCK) 제거
SELECT LTRIM(RTRIM(d.prccusnum)) AS "custNum",
       d.prcseq                  AS "seq",
       d.prcdtlseq               AS "subSeq",
       RTRIM(d.prccod)           AS "itemCode",
       RTRIM(d.prcitmcod)        AS "productName",
       d.prcdtlprc               AS "amount"
FROM raw.raw_crm_prcitmdtl d
WHERE EXISTS (SELECT 1 FROM raw.raw_crm_cstprcsub s
              WHERE s.cstcusnum = d.prccusnum AND s.cstseq = d.prcseq
                AND s.cstdte >= :from AND s.cstdte <= :to)
