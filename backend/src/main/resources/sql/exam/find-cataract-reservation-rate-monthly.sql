-- 백내장 예약률 — 검사일 이후 백내장 수술예약자 ÷ 백내장 검사수. 사람 단위. [월간 레포트 #17]
--
-- 정의·검증 이력: docs/지표정의/6-예약률.md
--
-- ⚠️ 2026-08-05 정의 교체 — 종전은 `Cataract_Exam` 추천 IOL **눈(안)** 분모였다.
--    종전 값은 2026-07 기준 54/123 = 43.9% 로 레거시 월간보고(57%)와 13%p 이상 벌어졌다.
--    분모가 미내원(RESERVE_STATE='Y')까지 포함해 123 으로 부푼 것이 주원인.
--
-- 집계 규칙
--   분모 = 백내장 검사수. find-cataract-monthly.sql 과 **완전히 같은 모집단**이어야 한다.
--          (RESERVATION FLAG='H' 내원 + 검안사 배정 → 레거시 분류 '백내장'+'중단')
--          ⚠️ 이 두 파일의 WHERE 절이 어긋나면 "예약률 분모 ≠ 검사수" 가 되어
--             같은 화면 안에서 숫자가 안 맞는다. 한쪽을 고치면 반드시 양쪽을 함께 고칠 것.
--   분자 = 분모 대상 중 백내장 수술예약 보유자
--          · RESERVE_FLAG='O' AND RESERVE_JINRYO='4'  (백내장 수술. JINRYO 를 빼면 시력교정이 섞인다)
--          · RESERVE_STATE <> 'C'                     (취소 제외)
--          · RESERVE_DATE >= 그 달 첫 검사일          (★ 기간 제한 — 아래 참조)
--
-- ⚠️ 분자에 기간 제한이 필요한 이유 (2026-07 실측)
--    조건이 없으면 과거 예약 이력까지 셈해 과대 집계된다. 고객 331693 은 검사일이 2026-07-28 인데
--    백내장 수술예약이 2022-08-30 단 1건뿐이다 — 1,428일(약 3년 11개월) 전.
--    4년 만에 재검사하러 온 분이라 전환이 아니라 오히려 이탈에 가깝다.
--    백내장은 재방문 비중이 높아(2026-07 기준 재방문 8명) 이 오염이 누적된다.
--
-- ⚠️ 집계 단위는 고객 × **연-월** 이다(고객 × 검사일 아님).
--    같은 달에 두 번 내원해도 1명이다 — find-cataract-monthly.sql 과 같은 규칙.
--    검사일 기준점은 그 달의 **첫 H 예약일**(MIN)을 쓴다.
--
-- ⚠️ 과거월이 소급 변동한다 — 분류가 CUSTOM 의 **현재** 담당자 값을 참조하므로
--    담당자 재배정 시 지난 달 숫자가 바뀐다. 2026-01~05 는 V27 골든 시드가,
--    2024·2025 는 V13 시드가 보호하며 배치가 write 하지 않는다(ConsultationMartJob 가드).
--    이 쿼리는 **2026-06 부터** 적용된다.
--
-- 2026 실측(2026-08-05) 분자/분모 → ceil 표시값 vs 레거시 월간보고 PDF
--   06: 32/55 → 59% (PDF 51%)   07: 32/57 → 57% (PDF 57% 일치)
--   ※ 01~05 는 골든 시드 구간이라 이 쿼리 값이 화면에 나가지 않는다(참고: 62/95·37/65·40/75·42/63·41/80).
            SELECT CAST(SUBSTRING(base.ym, 1, 4) AS INT) AS yr,
                   CAST(SUBSTRING(base.ym, 6, 2) AS INT) AS mo,
                   COUNT(*) AS examCount,
                   SUM(base.hasSurgeryBooking) AS surgeryBookedCount
            FROM (
                SELECT CH.ym,
                       CASE WHEN EXISTS (
                                SELECT 1
                                FROM RESERVATION op WITH(NOLOCK)
                                WHERE op.CUST_NUM = CH.CUST_NUM
                                  AND op.RESERVE_FLAG = 'O'
                                  AND op.RESERVE_JINRYO = '4'
                                  AND op.RESERVE_STATE <> 'C'
                                  AND op.RESERVE_DATE >= CH.firstExamDate
                            ) THEN 1 ELSE 0 END AS hasSurgeryBooking
                FROM (
                    SELECT B.CUST_NUM,
                           SUBSTRING(D.RESERVE_DATE, 1, 7) AS ym,
                           MIN(D.RESERVE_DATE)             AS firstExamDate
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
                    GROUP BY B.CUST_NUM, SUBSTRING(D.RESERVE_DATE, 1, 7)
                ) CH
                JOIN CUSTOM B WITH(NOLOCK) ON B.CUST_NUM = CH.CUST_NUM
                WHERE EXISTS (SELECT 1 FROM EMPLOYEE E WITH(NOLOCK) WHERE E.EMP_NUM = B.MY_OPTOMETRIST)
                  AND (
                    B.MY_COUNSELOR = 'BS0808'
                    OR EXISTS (SELECT 1 FROM EMPLOYEE E WITH(NOLOCK) WHERE E.EMP_NUM = B.MY_COUNSELOR)
                  )
            ) base
            GROUP BY base.ym
            ORDER BY yr, mo
