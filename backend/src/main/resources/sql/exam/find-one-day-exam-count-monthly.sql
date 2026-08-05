            SELECT CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT) AS yr,
                   CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT) AS mo,
                   COUNT(*) AS cnt
            FROM EXAM e WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = e.CUST_NUM
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
                SELECT 1
                FROM RESERVATION r WITH(NOLOCK)
                WHERE r.CUST_NUM = e.CUST_NUM
                  AND r.RESERVE_DATE = e.EXAM_DATE
                  AND r.RESERVE_FLAG = 'M'
                  AND r.RESERVE_STATE IN ('I','H')
                  AND r.RESERVE_JINRYO = '5'
                  AND LOWER(ISNULL(r.RESERVE_NUM, '')) NOT LIKE '%test%'
                  AND LOWER(ISNULL(r.RESERVE_NUM, '')) NOT LIKE '%kiosktest%'
              )
            GROUP BY CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT),
                     CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT)
            ORDER BY yr, mo
