            SELECT CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT) AS yr,
                   CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT) AS mo,
                   COUNT(*) AS cnt
            FROM EXAM e WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK) ON e.CUST_NUM = cu.CUST_NUM
            WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
              AND NOT (
                ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
              )
              AND NOT (
                    EXISTS (SELECT 1 FROM RESERVATION rd WITH(NOLOCK)
                            WHERE rd.CUST_NUM = e.CUST_NUM AND rd.RESERVE_DATE = e.EXAM_DATE
                              AND rd.RESERVE_STATE IN ('I','H') AND rd.RESERVE_FLAG = 'D'
                    )
                AND NOT EXISTS (SELECT 1 FROM RESERVATION rm WITH(NOLOCK)
                            WHERE rm.CUST_NUM = e.CUST_NUM AND rm.RESERVE_DATE = e.EXAM_DATE
                              AND rm.RESERVE_STATE IN ('I','H') AND rm.RESERVE_FLAG = 'M')
              )
              -- 순수 외래 유입 제외(2026-07-30 확정, docs/점검/시력교정-검사자_2026-06~07.md):
              -- 그날 검사(M) 내원 또는 수술 연계(수술예약 RESERVE_DATE>=검사일, 취소 제외 /
              -- 수술기록 OPERATION_DATE>=검사일)가 있어야 시력교정 검사자로 센다.
              -- select-exam-list.sql 의 hasSurgeryLink 와 동일 기준. 재수술·수술확정 환자는 유지.
              AND (
                    EXISTS (SELECT 1 FROM RESERVATION rm3 WITH(NOLOCK)
                            WHERE rm3.CUST_NUM = e.CUST_NUM AND rm3.RESERVE_DATE = e.EXAM_DATE
                              AND rm3.RESERVE_STATE IN ('I','H') AND rm3.RESERVE_FLAG = 'M')
                 OR EXISTS (SELECT 1 FROM RESERVATION ro WITH(NOLOCK)
                            WHERE ro.CUST_NUM = e.CUST_NUM AND ro.RESERVE_FLAG = 'O'
                              AND ro.RESERVE_STATE <> 'C' AND ro.RESERVE_DATE >= e.EXAM_DATE)
                 OR EXISTS (SELECT 1 FROM OPERATIONDATA od WITH(NOLOCK)
                            WHERE od.CUST_NUM = e.CUST_NUM AND ISNULL(od.OPERATION_DATE, '') <> ''
                              AND od.OPERATION_DATE >= e.EXAM_DATE)
              )
              AND NOT (
                EXISTS (
                  SELECT 1
                  FROM Cataract_Exam ce WITH(NOLOCK)
                  WHERE ce.CUST_NUM = e.CUST_NUM
                    AND ce.EXAM_DATE = e.EXAM_DATE
                )
                AND __EXAM_MEASUREMENTS_BLANK__
              )
            GROUP BY CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT), CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT)
            ORDER BY yr, mo
