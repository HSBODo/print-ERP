-- 결제수단별 항목 배분 (PrcItmDtl · PrcDtlSeq = CstSubSeq). 기간 내 전표에 딸린 배분만.
-- 회계 원형 _build-crm.js Q_DTL. PrcCod → 진료명 환산은 Java(VisionItemCatalog).
SELECT LTRIM(RTRIM(d.PrcCusNum)) AS custNum,
       d.PrcSeq                  AS seq,
       d.PrcDtlSeq               AS subSeq,
       RTRIM(d.PrcCod)           AS itemCode,
       RTRIM(d.PrcItmCod)        AS productName,
       d.PrcDtlPrc               AS amount
FROM PrcItmDtl d WITH(NOLOCK)
WHERE EXISTS (SELECT 1 FROM CstPrcSub s WITH(NOLOCK)
              WHERE s.CstCusNum = d.PrcCusNum AND s.CstSeq = d.PrcSeq
                AND s.CstDte >= :from AND s.CstDte <= :to)
