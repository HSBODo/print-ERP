-- 온라인 예약 구성요소 ③ 홈페이지 — 예약자 리스트_홈페이지 화면 건수와 동일. [MariaDB · 실시간]
--
-- 2026-07-24 예약 종합·월간 레포트 모두 이 값을 참조한다 — 리스트 화면과 정합 요구를 반영.
--
-- 리스트 화면(select-reservation-list-homepage.sql) 과 동일한 필터·계산:
--   · EXAM_TYPE 필터 없음 — 백내장(2)·노안(21)·렌즈삽입(24,25)·미상(1) 모두 포함
--   · dedup 없음         — 같은 사람 여러 신청건도 각각 카운트
--   · COUNT(*)           — 리스트가 그대로 보여주는 raw 건수
--   · M_NM 에 '테스트'/'TEST' 포함건 제외 — 리스트 화면과 동일하게 배치가 걸러야 정합이 유지된다.
-- 회귀 기준: from=2026-06-01 / to=2026-06-30 → 206건 (리스트 화면과 동일, 테스트 이름 필터 도입 전 값).
--
-- ⚠️ 네이버·카카오는 시력교정만 집계 — 이 홈페이지 판만 전 진료 포함이라 진료 범위 비대칭(의도적).
-- ../sqlite/select-monthly-list-raw.sql · sql/mart/select-list-reservation-homepage-monthly-list-raw.sql 과
-- 결과 계약(yr·mo·cnt) 동일해야 한다 — 한쪽만 고치지 말 것.
SELECT YEAR(REG_DATE)  AS `yr`,
       MONTH(REG_DATE) AS `mo`,
       COUNT(*)        AS `cnt`
  FROM TBL_COUNSEL
 WHERE CATEGORY = 'COUNSELONLINE'
   AND DEL_TF = 'N'
   AND COALESCE(M_NM, '') NOT LIKE '%테스트%'
   AND COALESCE(M_NM, '') NOT LIKE '%TEST%'
   AND REG_DATE >= :from
   AND REG_DATE <  DATE_ADD(:to, INTERVAL 1 DAY)
 GROUP BY YEAR(REG_DATE), MONTH(REG_DATE)
 ORDER BY `yr`, `mo`
