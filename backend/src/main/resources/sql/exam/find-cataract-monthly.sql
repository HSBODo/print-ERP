-- 백내장 검사수 — Cataract_Exam 기준, 눈(안) 단위. [월간 레포트 #11]
--
-- 월간보고 골든(PDF)이 '눈' 기준이라 그에 맞춘다. 2026-06-23 afa6149 가 레거시 BCRM
-- '백내장_검사' 화면에 맞추며 눈 → 사람(RESERVATION)으로 바꿨는데, 서로 다른 원장을 맞춘 셈이었다
-- (6월 오차 +20). 2026-07-15 눈 기준으로 복원 — java_dashboard cabe8fc 와 동일 정의.
--
-- 집계 규칙:
--   1) 중단(Stop_YN='Y') · 취소(Cancel_CD 있음) · 테스트 고객 제외
--   2) 같은 날 백내장 검사예약(RESERVE_FLAG='H', STATE IN 'I','H')이 있는 건만
--   3) 수술방법(OPERATIONR/L)이 입력된 눈만 각각 1건 → 좌+우 합산
--
-- ⚠️ 영향 범위는 2026+ 라이브만. 2024·2025 는 ExaminationStatsService.LEGACY_CATARACT
--    하드코딩 상수라 이 쿼리를 타지 않는다.
-- ⚠️ 리스트(전체 검사자 리스트)는 사람 기준이라 이 레포트(눈)와 단위가 어긋난다 — 의도된 미해결이다.
--    레포트=월간보고 재현 / 리스트=개별 환자 확인이라 목적이 다르다. 상세: docs/db/백내장-검사수-정의-정정.md §3
-- ⚠️ 되돌려도 골든과 완전히 맞지는 않는다 — 3월 −10 · 5월 −17 이 남는다(같은 문서 §5).
--    Cataract_Exam 은 고객당 1행 덮어쓰기 스냅샷이라 과거월이 소급 변동하는 점도 함께 볼 것.
--
-- 2026 실측(2026-07-15) vs 골든:  1월 96/96 · 2월 66/68 · 3월 66/76 · 4월 62/58 · 5월 67/84 · 6월 56/55
            SELECT CAST(SUBSTRING(ce.EXAM_DATE, 1, 4) AS INT) AS yr,
                   CAST(SUBSTRING(ce.EXAM_DATE, 6, 2) AS INT) AS mo,
                   SUM(CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(ce.OPERATIONR, ''))), '') IS NOT NULL THEN 1 ELSE 0 END)
                 + SUM(CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(ce.OPERATIONL, ''))), '') IS NOT NULL THEN 1 ELSE 0 END) AS cnt
            FROM Cataract_Exam ce WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK) ON ce.CUST_NUM = cu.CUST_NUM
            WHERE ce.EXAM_DATE >= :from AND ce.EXAM_DATE <= :to
              AND (ce.Stop_YN IS NULL OR ce.Stop_YN <> 'Y')
              AND (ce.Cancel_CD IS NULL OR LTRIM(RTRIM(ce.Cancel_CD)) = '')
              AND NOT (
                ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
              )
              AND EXISTS (
                SELECT 1
                FROM RESERVATION r WITH(NOLOCK)
                WHERE r.CUST_NUM = ce.CUST_NUM
                  AND r.RESERVE_DATE = ce.EXAM_DATE
                  AND r.RESERVE_STATE IN ('I','H')
                  AND r.RESERVE_FLAG = 'H'
              )
            GROUP BY CAST(SUBSTRING(ce.EXAM_DATE, 1, 4) AS INT), CAST(SUBSTRING(ce.EXAM_DATE, 6, 2) AS INT)
            ORDER BY yr, mo
