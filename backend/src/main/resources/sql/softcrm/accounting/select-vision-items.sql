-- 배분 상세(PrcItmDtl)가 없는 전표용 폴백 — 수납 단위 품목(PrcItmLst). 분할결제가 아닐 때만 쓴다.
-- 회계 원형 _build-crm.js Q_ITM.
SELECT LTRIM(RTRIM(p.PrcCusNum)) AS custNum,
       p.PrcSeq                  AS seq,
       RTRIM(p.PrcCod)           AS itemCode,
       RTRIM(p.PrcItmCod)        AS productName,
       p.PrcItmQty * p.PrcItmPrc AS amount
FROM PrcItmLst p WITH(NOLOCK)
WHERE EXISTS (SELECT 1 FROM CstPrcSub s WITH(NOLOCK)
              WHERE s.CstCusNum = p.PrcCusNum AND s.CstSeq = p.PrcSeq
                AND s.CstDte >= :from AND s.CstDte <= :to)
