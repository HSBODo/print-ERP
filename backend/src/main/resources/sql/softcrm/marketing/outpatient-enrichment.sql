;WITH visit_dates AS (
    SELECT r.CUST_NUM, r.RESERVE_DATE
    FROM RESERVATION r WITH(NOLOCK)
    WHERE r.RESERVE_FLAG IN ('F', 'D')
      AND r.RESERVE_STATE <> 'C'
      AND r.CUST_NUM IN (:customerNos)  -- 고정 13자리 — RTRIM 금지(인덱스)
      AND NOT EXISTS (
          SELECT 1
          FROM OPERATIONDATA o WITH(NOLOCK)
          WHERE o.CUST_NUM = r.CUST_NUM
            AND o.OPERATION_DATE = r.RESERVE_DATE
      )
    GROUP BY r.CUST_NUM, r.RESERVE_DATE
),
paid_visits AS (
    SELECT RTRIM(vd.CUST_NUM) AS customerNo,
           CONVERT(varchar(10), vd.RESERVE_DATE, 120) AS visitDate,
           cp_agg.totalCost,
           cp_agg.memos,
           ROW_NUMBER() OVER (PARTITION BY vd.CUST_NUM ORDER BY vd.RESERVE_DATE) AS rowNumber
    FROM visit_dates vd
    CROSS APPLY (
        SELECT SUM(cp.COST_PRICE) AS totalCost,
               STUFF((
                   SELECT ' / ' + RTRIM(cp2.COST_MEMO)
                   FROM COSTPRICE cp2 WITH(NOLOCK)
                   WHERE cp2.CUST_NUM = vd.CUST_NUM
                     AND cp2.COST_DATE = vd.RESERVE_DATE
                     AND ISNULL(RTRIM(cp2.COST_MEMO), '') <> ''
                   FOR XML PATH(''), TYPE
               ).value('.', 'nvarchar(max)'), 1, 3, '') AS memos
        FROM COSTPRICE cp WITH(NOLOCK)
        WHERE cp.CUST_NUM = vd.CUST_NUM
          AND cp.COST_DATE = vd.RESERVE_DATE
          AND cp.COST_PRICE > 0
    ) cp_agg
    WHERE cp_agg.totalCost > 0
)
SELECT customerNo,
       rowNumber,
       visitDate,
       totalCost AS visitCost,
       ISNULL(memos, '') AS visitMemo
FROM paid_visits
WHERE rowNumber <= 3
