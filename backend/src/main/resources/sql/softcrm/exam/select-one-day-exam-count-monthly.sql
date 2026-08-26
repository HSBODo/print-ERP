-- 원데이 검사수(월간 레포트 #14) — 검사자 리스트(all-exam-list)의 examType='원데이' 와 동일 모집단.
--
-- 2026-08-05 변경: 종전에는 시력교정(EXAM) 원데이만 셌다(2026-07: 558).
--   리스트는 백내장 라인의 원데이(진료구분 7·9)도 세므로 561 이라 두 화면이 3건 어긋났다.
--   '원데이 + 일반 = 검사수(전체)' 가 성립해야 한다는 방침에 따라 백내장 갈래를 UNION 한다.
--     2026-07: 시력교정 558 + 백내장 3 = 561, 일반 643 → 합 1,204 = 검사수.
--   드림렌즈는 구조상 원데이가 없다(M 예약이 있으면 그 순간 시력교정으로 분류된다).
--
-- ⚠️ 백내장 갈래는 sql/exam/select-all-exam-list.sql 의 백내장 UNION 과 **같은 규칙**이어야 한다
--    (모집단 §2-3 + 원데이 판정 7·9). 한쪽만 고치면 리스트와 다시 어긋난다.
-- ⚠️ 1~5월은 V27 골든 시드가 우선이라 배치가 덮지 않는다 — 6월부터 적용된다.
            SELECT yr, mo, SUM(cnt) AS cnt
            FROM (
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

            UNION ALL

            -- 백내장 원데이 — 고객 × 검사일 단위로 접은 뒤 그날 예약 중 진료구분 7·9 가 하나라도 있으면 원데이.
            SELECT CAST(SUBSTRING(c.d, 1, 4) AS INT) AS yr,
                   CAST(SUBSTRING(c.d, 6, 2) AS INT) AS mo,
                   COUNT(*) AS cnt
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
            GROUP BY CAST(SUBSTRING(c.d, 1, 4) AS INT),
                     CAST(SUBSTRING(c.d, 6, 2) AS INT)
            ) u
            GROUP BY yr, mo
            ORDER BY yr, mo
