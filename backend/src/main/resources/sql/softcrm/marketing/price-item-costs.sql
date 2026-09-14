SELECT RTRIM(cp.CUST_NUM) AS customerNo,
       CASE
           WHEN pr.PrcCod = 'O' THEN 'surgery'
           WHEN pr.PrcCod = '33' THEN 'exam'
           ELSE 'other'
       END AS category,
       SUM(pr.PrcItmQty * pr.PrcItmPrc) AS total
FROM COSTPRICE cp WITH(NOLOCK)
JOIN PrcItmLst pr WITH(NOLOCK)
  ON cp.CUST_NUM = pr.PrcCusNum
 AND cp.SEQ = pr.PrcSeq
WHERE cp.CUST_NUM IN (:customerNos)  -- 고정 13자리 — RTRIM 금지(인덱스)
  AND pr.PrcItmPrc <> 0
  AND cp.PayStt <> 'a'
GROUP BY cp.CUST_NUM,
         CASE
             WHEN pr.PrcCod = 'O' THEN 'surgery'
             WHEN pr.PrcCod = '33' THEN 'exam'
             ELSE 'other'
         END
