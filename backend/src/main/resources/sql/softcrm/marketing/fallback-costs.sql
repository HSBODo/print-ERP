;WITH classified AS (
    SELECT RTRIM(cp.CUST_NUM) AS customerNo,
           CASE WHEN EXISTS (
               SELECT 1
               FROM OPERATIONDATA o WITH(NOLOCK)
               WHERE o.CUST_NUM = cp.CUST_NUM
                 AND o.OPERATION_DATE = cp.COST_DATE
           ) THEN 'surgery' ELSE 'exam' END AS category,
           cp.COST_PRICE
    FROM COSTPRICE cp WITH(NOLOCK)
    WHERE cp.CUST_NUM IN (:customerNos)  -- 고정 13자리 — RTRIM 금지(인덱스)
      AND cp.COST_PRICE > 0
)
SELECT customerNo, category, SUM(COST_PRICE) AS total
FROM classified
GROUP BY customerNo, category
