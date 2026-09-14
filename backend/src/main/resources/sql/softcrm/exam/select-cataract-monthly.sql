-- 백내장 검사수 — RESERVATION(백내장검사 예약) 기준, 사람 단위. [월간 레포트 #11]
--
-- 레거시 원장: BCRM > 통계(C) > 통계_백내장_내원동기 의 분류 '백내장' + '중단'.
-- 2026-07-23 원본 SQL 확보 후 재현 성공(6월 55/55 정확 일치).
--
-- 집계 규칙:
--   1) 기간 내 백내장검사 예약(RESERVE_FLAG='H') 내원 고객 — DISTINCT CUST_NUM
--      · RESERVE_JINRYO <> '3' (C_재검사 제외)
--      · RESERVE_SEQ    <> 3   (노안5진료실 제외)
--      · RESERVE_STATE NOT IN ('C','Y')  (취소·미내원 제외)
--   2) 그중 검안사(MY_OPTOMETRIST)가 배정된 사람만
--      · 상담사 = 'BS0808'(BS미지정) → 레거시 분류 '중단'
--      · 상담사 배정됨                → 레거시 분류 '백내장'
--      · 둘 다 검사수에 포함한다. 검안사 없으면 'F/U'(외래 추적)라 제외된다.
--
-- ⚠️ 레거시 원본은 `(SELECT EMP_NAME ...) = (SELECT EMP_NAME ...)` 패턴을 쓰는데 이는 사실상 IS NOT NULL 검사다.
--    `MY_OPTOMETRIST IS NOT NULL` 로 옮기면 빈 문자열이 걸려 분류가 뒤집힌다(중단 65 / F/U 3). 반드시 EXISTS(EMPLOYEE) 로 판정할 것.
--
-- ⚠️ 과거월은 소급 변동한다 — 분류가 CUSTOM 의 **현재** 담당자 값을 참조하므로 담당자 재배정 시 지난 달 숫자가 바뀐다.
--    그래서 2026-01~05 는 골든 확정값을 seed 로 고정하고, 이 쿼리는 2026-06 부터 적용한다.
--    2024·2025 는 종전대로 V9 seed 가 SSOT.
--
-- ⚠️ 리스트(cataract-exam-list, Cataract_Exam 기준)와 모집단이 다르다 — 6월 레거시 115 vs 리스트 114, 겹치는 인원 109.
--    레포트=예약 기준 / 리스트=검사기록 기준으로 목적이 달라 의도된 차이다.
--
-- 2026 실측(2026-07-23) vs 골든:  1월 95/96 · 2월 65/68 · 3월 75/76 · 4월 63/58 · 5월 80/84 · 6월 55/55
            SELECT CAST(SUBSTRING(CH.firstDate, 1, 4) AS INT) AS yr,
                   CAST(SUBSTRING(CH.firstDate, 6, 2) AS INT) AS mo,
                   COUNT(*) AS cnt
            FROM (
                SELECT DISTINCT
                       B.CUST_NUM,
                       SUBSTRING(D.RESERVE_DATE, 1, 7) AS firstDate
                FROM CUSTOM B WITH(NOLOCK)
                JOIN RESERVATION D WITH(NOLOCK) ON D.CUST_NUM = B.CUST_NUM
                WHERE D.RESERVE_DATE >= :from AND D.RESERVE_DATE <= :to
                  AND D.RESERVE_FLAG = 'H'
                  AND ISNULL(D.RESERVE_JINRYO, '') <> '3'
                  AND ISNULL(D.RESERVE_SEQ, 0) <> 3
                  AND D.RESERVE_STATE NOT IN ('C', 'Y')
                  AND B.CUST_NUM <> '9999999999999'
                  AND NOT (
                    ISNULL(B.CUST_NAME, '') LIKE N'%테스트%'
                    OR LOWER(ISNULL(B.CUST_NAME, '')) LIKE '%test%'
                  )
            ) CH
            JOIN CUSTOM B WITH(NOLOCK) ON B.CUST_NUM = CH.CUST_NUM
            WHERE EXISTS (SELECT 1 FROM EMPLOYEE E WITH(NOLOCK) WHERE E.EMP_NUM = B.MY_OPTOMETRIST)
              AND (
                B.MY_COUNSELOR = 'BS0808'
                OR EXISTS (SELECT 1 FROM EMPLOYEE E WITH(NOLOCK) WHERE E.EMP_NUM = B.MY_COUNSELOR)
              )
            GROUP BY CAST(SUBSTRING(CH.firstDate, 1, 4) AS INT), CAST(SUBSTRING(CH.firstDate, 6, 2) AS INT)
            ORDER BY yr, mo
