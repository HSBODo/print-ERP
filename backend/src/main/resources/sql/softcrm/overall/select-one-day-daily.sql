-- 일별 원데이 검사수 + 원데이 수술예약수.
--
-- 2026-08-05 변경: 종전에는 시력교정(EXAM) 원데이만 셌다(2026-07: 558).
--   검사자 리스트의 examType='원데이' 는 백내장 라인(진료구분 7·9)도 세므로 561 이라 어긋났다.
--   '원데이 + 일반 = 검사수(전체)' 방침에 따라 백내장 갈래를 UNION 한다.
--   규칙은 sql/exam/select-one-day-exam-count-monthly.sql · select-all-exam-list.sql 과 같아야 한다.
--
-- 2026-08-06 변경: oneDayBooked(분자)를 '수술 실시' 에서 '수술 예약' 으로 바로잡았다.
--   종전 분자는 OPERATIONDATA(수술 실시)에서 **검사일~+7일** 사이 수술한 사람을 셌다.
--   화면 라벨은 "수술예약건/검사자" 인데 실제로는 수술한 사람을 세고 있어서,
--   ① 7일 넘겨 수술한 사람 ② 예약만 하고 아직 수술 안 한 사람 이 빠졌다.
--   (월말 검사자는 수술까지 갈 시간이 없어 구조적으로 불리했다.)
--   그 결과 레거시 대비 매달 3~4%p 씩 일정하게 낮았다.
--
--   새 분자 = 검사일 이후 수술예약 보유 (RESERVE_FLAG='O' · RESERVE_STATE<>'C' · 예약일 >= 검사일)
--   백내장 예약률(select-cataract-reservation-rate-monthly.sql)과 같은 규칙이다.
--
--   실측 대조 (ceil 표시값)
--     레거시  90 · 91 · 90 · 87 · 91 ·  — · 92   (1~5월 골든 · 7월 PDF)
--     종전    87 · 88 · 87 · 83 · 88 · 89 · 87
--     새정의  91 · 91 · 90 · 87 · 90 · 92 · 92   ← 4개월 정확히 일치, 나머지 ±1%p
--
--   ⚠️ 월간 레포트의 2026-01~05 는 OverallMartJob 의 is2026H1Seeded 가드가 막아 바뀌지 않는다.
--      주간 검사자 종합지표·주차 레포트는 원래 전 구간 라이브라 과거 구간도 새 정의로 다시 계산된다.
--
-- 백내장 갈래도 분자를 센다(종전엔 0 이라 분모만 늘려 예약률을 끌어내렸다).
--   진료구분(JINRYO)은 걸지 않는다 — 모집단이 이미 백내장 원데이 내원자라
--   그 사람의 수술예약은 백내장 수술이다. 시력교정 갈래와 같은 술어를 쓴다.
            SELECT d, SUM(oneDay) AS oneDay, SUM(oneDayBooked) AS oneDayBooked
            FROM (
            SELECT e.EXAM_DATE AS d,
                   COUNT(*) AS oneDay,
                   SUM(CASE WHEN booked.hit IS NULL THEN 0 ELSE 1 END) AS oneDayBooked
            FROM EXAM e WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = e.CUST_NUM
            OUTER APPLY (
                SELECT TOP 1 1 AS hit
                FROM RESERVATION op WITH(NOLOCK)
                WHERE op.CUST_NUM = e.CUST_NUM
                  AND op.RESERVE_FLAG = 'O'
                  AND op.RESERVE_STATE <> 'C'
                  AND op.RESERVE_DATE >= e.EXAM_DATE
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
            -- ⚠️ 예약 보유 판정을 SUM(CASE WHEN EXISTS(...)) 로 쓰면 MSSQL 이 거부한다
            --    ("Cannot perform an aggregate function on an expression containing a subquery").
            --    그래서 집계하지 않는 계층(bk)에서 0/1 로 만든 뒤 바깥에서 SUM 한다.
            SELECT bk.d AS d,
                   COUNT(*) AS oneDay,
                   SUM(bk.booked) AS oneDayBooked
            FROM (
                SELECT c.cn, c.d, c.isOneDay,
                       CASE WHEN EXISTS (
                           SELECT 1 FROM RESERVATION op WITH(NOLOCK)
                           WHERE op.CUST_NUM = c.cn
                             AND op.RESERVE_FLAG = 'O'
                             AND op.RESERVE_STATE <> 'C'
                             AND op.RESERVE_DATE >= c.d
                       ) THEN 1 ELSE 0 END AS booked
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
            ) bk
            WHERE bk.isOneDay = 1
            GROUP BY bk.d
            ) u
            GROUP BY d
            ORDER BY d
