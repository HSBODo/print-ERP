            SELECT e.EXAM_DATE AS d, COUNT(*) AS cnt
            FROM EXAM e WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK) ON e.CUST_NUM = cu.CUST_NUM
            WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
              AND NOT (
                ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
              )
              AND EXISTS (SELECT 1 FROM RESERVATION rd WITH(NOLOCK)
                          WHERE rd.CUST_NUM = e.CUST_NUM AND rd.RESERVE_DATE = e.EXAM_DATE
                            AND rd.RESERVE_STATE IN ('I','H') AND rd.RESERVE_FLAG = 'D')
              AND NOT EXISTS (SELECT 1 FROM RESERVATION rm WITH(NOLOCK)
                              WHERE rm.CUST_NUM = e.CUST_NUM AND rm.RESERVE_DATE = e.EXAM_DATE
                                AND rm.RESERVE_STATE IN ('I','H') AND rm.RESERVE_FLAG = 'M')
              AND NOT (
                EXISTS (
                  SELECT 1 FROM Cataract_Exam ce WITH(NOLOCK)
                  WHERE ce.CUST_NUM = e.CUST_NUM AND ce.EXAM_DATE = e.EXAM_DATE
                )
                AND __EXAM_MEASUREMENTS_BLANK__
              )
            GROUP BY e.EXAM_DATE
            ORDER BY e.EXAM_DATE
