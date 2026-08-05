-- 검사수(월간 레포트 #13) — 검사자 리스트(all-exam-list)와 동일 모집단.
--
-- 2026-08-04 변경: 종전에는 `EXAM 행 전부 + Cataract_Exam 행 전부` 를 raw COUNT 했다.
--   리스트는 테스트고객·백내장스텁·순수외래를 빼고, 백내장을 예약(H)+검안사배정 기준으로 세는데
--   검사수만 필터 없이 세서 두 화면이 어긋났다 (2026-07: 검사수 1,195 vs 리스트 1,158).
--   특히 백내장이 Cataract_Exam 91 vs 리스트 56 으로 35 차이났다.
--   이제 sql/fragments/exam-session-source.sql 을 공유해 정의가 하나다.
--
-- ⚠️ 1~5월은 V27 골든 시드(mart_procedure_exam_monthly)가 우선이라 배치가 덮지 않는다 — 6월부터 적용된다.
            SELECT CAST(SUBSTRING(t.d, 1, 4) AS INT) AS yr,
                   CAST(SUBSTRING(t.d, 6, 2) AS INT) AS mo,
                   COUNT(*) AS cnt
            FROM (
__EXAM_SESSION_SOURCE__
            ) t
            GROUP BY CAST(SUBSTRING(t.d, 1, 4) AS INT),
                     CAST(SUBSTRING(t.d, 6, 2) AS INT)
            ORDER BY yr, mo
