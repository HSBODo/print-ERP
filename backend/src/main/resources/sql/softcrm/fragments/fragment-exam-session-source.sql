-- 검사 세션 모집단 — 검사자 리스트와 1:1 정합.
-- 출력 컬럼: cn(고객번호) · d(검사일) · isCat · catClass
--
-- ⚠️ isCat 은 "백내장/드림렌즈 여부"가 아니라 **월간 레포트 백내장 검사수 집계 대상** 플래그다.
--    백내장 예약 행이어도 분류가 '노안/FU'·'기타'면 isCat=0 이다(전체 검사수에는 들어가고 백내장 검사수에는 빠진다).
--    시력교정/드림렌즈인지 가리려면 isCat 이 아니라 catClass = '' 인지 볼 것.
--    catClass: '' = 시력교정/드림렌즈 / '백내장' · '중단' · '노안/FU' · '기타' = 백내장 예약 행
--
-- 2026-08-04 도입. 종전에는 레포트 집계가 `EXAM 행 전부 + Cataract_Exam 행 전부`를 raw COUNT 했고,
-- 리스트(list_exam · list_cataract_exam)는 각자 필터를 적용해 두 화면이 어긋났다(2026-07 기준 1,195 vs 1,158).
-- 이제 리스트와 같은 모집단을 여기서 한 번만 정의하고 레포트 집계가 공유한다.
--
-- ⚠️ 이 조각을 쓰는 곳(SqlFragments.examSessionSource() 로 치환):
--   - sql/exam/select-total-exam-count-monthly.sql   검사수(월간 레포트 #13)
--   - sql/exam/select-exam-count-by-class-monthly.sql 고객분류별 검사수(#7)
--   - sql/overall/select-demographics-daily.sql       총검사자·직업·소개 구분(#4~#10, 주간 종합지표)
--
-- ⚠️ 리스트 쪽 규칙을 고치면 여기도 함께 고칠 것:
--   - 시력교정/드림렌즈 → sql/exam/select-exam-list.sql
--   - 백내장           → sql/exam/select-cataract-exam-list.sql
--
-- ⚠️ 2026-08-05: 백내장 갈래를 리스트와 함께 102(2026-07) 로 넓혔다. 종전에는 담당자 배정 건(56)만 실어
--    레거시에서 'F/U'·빈칸으로 잡히던 46건이 전체 검사수에서도 빠져 있었다.
--    백내장 검사수(56)는 isCat 으로 고정되고, 늘어난 46건은 전체 검사수·직업·소개 집계에만 반영된다.
--
-- 집계 단위: 시력교정/드림렌즈 = EXAM 행 / 백내장 = 고객 × 검사일.
--   (백내장 리스트는 조회기간 내 고객당 1행이라, 한 달 조회 시 결과가 같다.
--    같은 달에 두 날짜로 내원한 고객이 있으면 여기서는 2행 — 월 조회 기준과 어긋날 수 있음)

              -- 시력교정 · 드림렌즈: EXAM 행 (select-exam-list.sql 과 동일 필터)
              --   ① 테스트 고객 제외
              --   ② 백내장 스텁 제외 — 같은날 백내장검사 기록이 있고 EXAM 측정값이 전무한 행
              --   ③ 순수 외래 유입 제외 — 그날 검사(M)·드림렌즈(D) 내원도, 수술 연계도 없는 행
              SELECT e.CUST_NUM AS cn, e.EXAM_DATE AS d, 0 AS isCat, CAST(N'' AS NVARCHAR(20)) AS catClass
              FROM EXAM e WITH(NOLOCK)
              JOIN CUSTOM cux WITH(NOLOCK) ON cux.CUST_NUM = e.CUST_NUM
              WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
                AND NOT (
                  ISNULL(cux.CUST_NAME, '') LIKE N'%테스트%'
                  OR LOWER(ISNULL(cux.CUST_NAME, '')) LIKE '%test%'
                )
                AND NOT (
                  EXISTS (
                    SELECT 1 FROM Cataract_Exam ce WITH(NOLOCK)
                    WHERE ce.CUST_NUM = e.CUST_NUM AND ce.EXAM_DATE = e.EXAM_DATE
                  )
                  AND __EXAM_MEASUREMENTS_BLANK__
                )
                -- ④ 백내장 갈래와 중복 제거 (2026-08-05) — select-exam-list.sql 과 동일 조건.
                --    백내장 예약(H)으로만 내원한 날의 EXAM 행은 아래 백내장 갈래가 이미 센다.
                --    ②(측정값 전무)에 안 걸리고 ③의 수술연계로 살아남아 같은 사람이 두 번 세어졌다
                --    (2026-01~05 실측 4건: 1월 2 · 3월 1 · 5월 1).
                --    그날 시력교정(M)·드림렌즈(D) 내원이 실제로 있으면 별개 세션이므로 유지한다.
                --    EXISTS 조건은 아래 백내장 갈래의 모집단과 일치해야 한다 — 함께 고칠 것.
                AND NOT (
                  NOT EXISTS (
                    SELECT 1 FROM RESERVATION rmx WITH(NOLOCK)
                    WHERE rmx.CUST_NUM = e.CUST_NUM AND rmx.RESERVE_DATE = e.EXAM_DATE
                      AND rmx.RESERVE_STATE IN ('I','H') AND rmx.RESERVE_FLAG IN ('M','D')
                  )
                  AND EXISTS (
                    SELECT 1 FROM RESERVATION rh WITH(NOLOCK)
                    WHERE rh.CUST_NUM = e.CUST_NUM AND rh.RESERVE_DATE = e.EXAM_DATE
                      AND rh.RESERVE_FLAG = 'H'
                      AND ISNULL(rh.RESERVE_JINRYO, '') <> '3'
                      AND ISNULL(rh.RESERVE_SEQ, 0) <> 3
                      AND rh.RESERVE_STATE NOT IN ('C','Y')
                  )
                )
                AND (
                  EXISTS (
                    SELECT 1 FROM RESERVATION rm WITH(NOLOCK)
                    WHERE rm.CUST_NUM = e.CUST_NUM AND rm.RESERVE_DATE = e.EXAM_DATE
                      AND rm.RESERVE_STATE IN ('I','H') AND rm.RESERVE_FLAG = 'M'
                  )
                  OR EXISTS (
                    SELECT 1 FROM RESERVATION rd WITH(NOLOCK)
                    WHERE rd.CUST_NUM = e.CUST_NUM AND rd.RESERVE_DATE = e.EXAM_DATE
                      AND rd.RESERVE_STATE IN ('I','H') AND rd.RESERVE_FLAG = 'D'
                  )
                  OR EXISTS (
                    SELECT 1 FROM RESERVATION ro WITH(NOLOCK)
                    WHERE ro.CUST_NUM = e.CUST_NUM AND ro.RESERVE_FLAG = 'O'
                      AND ro.RESERVE_STATE <> 'C' AND ro.RESERVE_DATE >= e.EXAM_DATE
                  )
                  OR EXISTS (
                    SELECT 1 FROM OPERATIONDATA od WITH(NOLOCK)
                    WHERE od.CUST_NUM = e.CUST_NUM AND ISNULL(od.OPERATION_DATE, '') <> ''
                      AND od.OPERATION_DATE >= e.EXAM_DATE
                  )
                )

              UNION ALL

              -- 백내장: 백내장검사 예약 내원 (select-cataract-exam-list.sql 과 동일 규칙 — 함께 고칠 것)
              --   FLAG='H' · JINRYO<>'3'(C_재검사) · SEQ<>3(수술 당일 검사) · STATE NOT IN ('C','Y')
              --   담당자 배정 여부로 거르지 않고, 분류(catClass)로만 가른다.
              --   isCat=1 은 '백내장'·'중단'만 — 이 둘의 합이 월간 레포트 백내장 검사수다.
              SELECT B.CUST_NUM AS cn, D2.RESERVE_DATE AS d,
                     CASE WHEN opt.v = 1 AND (B.MY_COUNSELOR = 'BS0808' OR cns.v = 1)
                          THEN 1 ELSE 0 END AS isCat,
                     CAST(CASE WHEN opt.v = 1 AND B.MY_COUNSELOR = 'BS0808' THEN N'중단'
                               WHEN opt.v = 1 AND cns.v = 1                 THEN N'백내장'
                               WHEN B.MY_COUNSELOR = 'BS0808'               THEN N'노안/FU'
                               ELSE N'기타' END AS NVARCHAR(20)) AS catClass
              FROM CUSTOM B WITH(NOLOCK)
              JOIN RESERVATION D2 WITH(NOLOCK) ON D2.CUST_NUM = B.CUST_NUM
              CROSS APPLY (SELECT CASE WHEN EXISTS (SELECT 1 FROM EMPLOYEE E1 WITH(NOLOCK)
                                                    WHERE E1.EMP_NUM = B.MY_OPTOMETRIST) THEN 1 ELSE 0 END AS v) opt
              CROSS APPLY (SELECT CASE WHEN EXISTS (SELECT 1 FROM EMPLOYEE E2 WITH(NOLOCK)
                                                    WHERE E2.EMP_NUM = B.MY_COUNSELOR)   THEN 1 ELSE 0 END AS v) cns
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
              GROUP BY B.CUST_NUM, D2.RESERVE_DATE,
                       CASE WHEN opt.v = 1 AND (B.MY_COUNSELOR = 'BS0808' OR cns.v = 1)
                            THEN 1 ELSE 0 END,
                       CASE WHEN opt.v = 1 AND B.MY_COUNSELOR = 'BS0808' THEN N'중단'
                            WHEN opt.v = 1 AND cns.v = 1                 THEN N'백내장'
                            WHEN B.MY_COUNSELOR = 'BS0808'               THEN N'노안/FU'
                            ELSE N'기타' END
