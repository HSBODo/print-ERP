-- 온라인 예약 구성요소 ③ 홈페이지 — 예약자 리스트_홈페이지의 '중복제외' 월별 건수. [MariaDB · 실시간]
--
-- 2026-06 부터 온라인 예약 = 네이버 + 카카오톡 + 홈페이지(중복제외) 로 재정의되면서 신설.
-- 소스는 레거시 홈페이지 운영 DB — CRM(MSSQL) 이 아니다. 그래서 SQL 로 네이버·카카오와 조인할 수 없고,
-- 합산은 ReservationOverallStatsService 에서 한다.
-- ../sqlite/monthly-deduped.sql 과 결과 계약(yr·mo·cnt)이 동일해야 한다 — 한쪽만 고치지 말 것.
--
-- 화면(reservation-list-homepage.sql)과 다른 점 — 여기는 '집계'라 조건이 더 좁다:
--   1) EXAM_TYPE='5' (시력교정수술 전 검사) 만.
--      백내장(2)·노안(21)·렌즈삽입(24,25) 제외 + 라벨 없는 코드 '1' 도 제외 (2026-07-15 결정).
--      ※ 백내장은 2025-02 이후 실제로 0건이라 최근 구간에서 이 필터는 사실상 코드 '1' 만 걸러낸다.
--   2) COUNT(DISTINCT M_PHONE) — 같은 사람이 한 달에 여러 번 신청한 건을 1건으로 본다.
--      dedup 범위는 '달 안'이다(GROUP BY 로 월을 나눈 뒤 DISTINCT). 5월·6월에 각각 신청했으면 각 달 1건.
--
-- REG_DATE 가 datetime 이라 연·월은 YEAR()/MONTH() 로 뽑는다(SQLite 판은 substr 문자열 절단).
SELECT YEAR(REG_DATE)          AS `yr`,
       MONTH(REG_DATE)         AS `mo`,
       COUNT(DISTINCT M_PHONE) AS `cnt`
  FROM TBL_COUNSEL
 WHERE CATEGORY = 'COUNSELONLINE'
   AND DEL_TF = 'N'
   AND EXAM_TYPE = '5'
   AND REG_DATE >= :from
   AND REG_DATE <  DATE_ADD(:to, INTERVAL 1 DAY)
 GROUP BY YEAR(REG_DATE), MONTH(REG_DATE)
 ORDER BY `yr`, `mo`
