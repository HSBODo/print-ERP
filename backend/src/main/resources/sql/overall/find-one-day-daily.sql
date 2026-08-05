-- 일별 원데이 검사수 + 원데이 수술예약수.
--
-- 2026-08-05 변경: 종전에는 시력교정(EXAM) 원데이만 셌다(2026-07: 558).
--   검사자 리스트의 examType='원데이' 는 백내장 라인(진료구분 7·9)도 세므로 561 이라 어긋났다.
--   '원데이 + 일반 = 검사수(전체)' 방침에 따라 백내장 갈래를 UNION 한다.
--   규칙은 sql/exam/find-one-day-exam-count-monthly.sql · find-all-exam-list.sql 과 같아야 한다.
--
-- ⚠️ oneDayBooked(원데이 예약률 분자)는 시력교정 수술예약만 센다. 백내장 갈래는 0 으로 들어가므로
--    분모만 늘어 예약률이 소폭 낮아진다(2026-07: 483/558=86.6% → 483/561=86.1%).
--    백내장 수술예약을 분자에 넣으려면 별도 작업이 필요하다.
            SELECT d, SUM(oneDay) AS oneDay, SUM(oneDayBooked) AS oneDayBooked
            FROM (
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

            UNION ALL

            -- 백내장 원데이 — 고객 × 검사일로 접은 뒤 그날 예약에 진료구분 7·9 가 있으면 원데이.
            SELECT c.d AS d, COUNT(*) AS oneDay, 0 AS oneDayBooked
            FROM (
                SELECT B.CUST_NUM AS cn, D2.RESERVE_DATE AS d,
                       MAX(CASE WHEN ISNULL(D2.RESERVE_JINRYO, '') IN ('7', '9') THEN 1 ELSE 0 END) AS isOneDay
                FROM CUSTOM B WITH(NOLOCK)
                JOIN RESERVATION D2 WITH(NOLOCK) ON D2.CUST_NUM = B.CUST_NUM
                WHERE D2.RESERVE_DATE >= :from AND D2.RESERVE_DATE <= :to
                  AND D2.RESERVE_FLAG = 'H'
                  AND ISNULL(D2.RESERVE_JINRYO, '') <> '3'
                  AND ISNULL(D2.RESERVE_SEQ, 0) <> 3
                  AND D2.RESERVE_STATE NOT IN ('C', 'Y')
                  AND B.CUST_NUM <> '9999999999999'
                  AND NOT (
                    ISNULL(B.CUST_NAME, '') LIKE N'%테스트%'
                    OR LOWER(ISNULL(B.CUST_NAME, '')) LIKE '%test%'
                  )
                GROUP BY B.CUST_NUM, D2.RESERVE_DATE
            ) c
            WHERE c.isOneDay = 1
            GROUP BY c.d
            ) u
            GROUP BY d
            ORDER BY d
