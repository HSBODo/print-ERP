            SELECT e.EXAM_DATE AS d,
                   COUNT(*) AS oneDay,
                   SUM(CASE WHEN booked.hit IS NULL THEN 0 ELSE 1 END) AS oneDayBooked
            FROM EXAM e WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = e.CUST_NUM
            OUTER APPLY (
                SELECT TOP 1 1 AS hit
                FROM OPERATIONDATA o WITH(NOLOCK)
                WHERE o.CUST_NUM = e.CUST_NUM
                  AND o.OPERATION_DATE >= e.EXAM_DATE
                  AND o.OPERATION_DATE <= CONVERT(varchar(10), DATEADD(day, 7, CONVERT(date, e.EXAM_DATE)), 23)
                  AND NOT EXISTS (
                      SELECT 1 FROM Cataract_Operationdata co WITH(NOLOCK)
                      WHERE co.CUST_NUM = o.CUST_NUM
                  )
                  AND (
                    (o.OPERATIONR IS NOT NULL AND RTRIM(o.OPERATIONR) <> ''
                       AND o.OPERATIONR NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST'))
                    OR (o.OPERATIONL IS NOT NULL AND RTRIM(o.OPERATIONL) <> ''
                       AND o.OPERATIONL NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST'))
                  )
            ) booked
            WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
              -- 2026-07-30 확정: 중단/취소(STOP_YN·CANCEL_CD) 단서 제거 — 원데이 = 당일OP 예약 기준
              -- (docs/점검/원데이-레거시-비교_2026-07.md §5)
              AND NOT (
                ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                OR ISNULL(e.EXAM_MEMO, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(e.EXAM_MEMO, '')) LIKE '%test%'
              )
              AND EXISTS (
                SELECT 1 FROM RESERVATION r WITH(NOLOCK)
                WHERE r.CUST_NUM = e.CUST_NUM
                  AND r.RESERVE_DATE = e.EXAM_DATE
                  AND r.RESERVE_FLAG = 'M'
                  AND r.RESERVE_STATE IN ('I','H')
                  AND r.RESERVE_JINRYO = '5'
                  AND LOWER(ISNULL(r.RESERVE_NUM, '')) NOT LIKE '%test%'
                  AND LOWER(ISNULL(r.RESERVE_NUM, '')) NOT LIKE '%kiosktest%'
              )
            GROUP BY e.EXAM_DATE
            ORDER BY e.EXAM_DATE
