            SELECT CAST(SUBSTRING(r.RESERVE_DATE, 1, 4) AS INT) AS yr,
                   CAST(SUBSTRING(r.RESERVE_DATE, 6, 2) AS INT) AS mo,
                   COUNT(*) AS cnt
            FROM RESERVATION r WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK) ON r.CUST_NUM = cu.CUST_NUM
            WHERE r.RESERVE_DATE >= :from AND r.RESERVE_DATE <= :to
              AND r.RESERVE_FLAG = 'F'
              AND r.RESERVE_STATE IN ('I','H')
              AND NOT (
                ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
              )
            GROUP BY CAST(SUBSTRING(r.RESERVE_DATE, 1, 4) AS INT),
                     CAST(SUBSTRING(r.RESERVE_DATE, 6, 2) AS INT)
            ORDER BY yr, mo
