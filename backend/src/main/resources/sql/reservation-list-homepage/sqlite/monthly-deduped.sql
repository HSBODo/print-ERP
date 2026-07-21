-- 온라인 예약 구성요소 ③ 홈페이지 — 예약자 리스트_홈페이지의 '중복제외' 월별 건수.
--
-- 2026-06 부터 온라인 예약 = 네이버 + 카카오톡 + 홈페이지(중복제외) 로 재정의되면서 신설.
-- 소스는 레거시 홈페이지(SQLite 스냅샷) — CRM(MSSQL) 이 아니다. 그래서 SQL 로 네이버·카카오와
-- 조인할 수 없고, 합산은 ReservationOverallStatsService 에서 한다.
--
-- 화면(reservation-list-homepage.sql)과 다른 점 — 여기는 '집계'라 조건이 더 좁다:
--   1) exam_type='5' (시력교정수술 전 검사) 만.
--      백내장(2)·노안(21)·렌즈삽입(24,25) 제외 + 라벨 없는 코드 '1' 도 제외 (2026-07-15 결정).
--      ※ 백내장은 2025-02 이후 실제로 0건이라 최근 구간에서 이 필터는 사실상 코드 '1' 만 걸러낸다.
--   2) COUNT(DISTINCT phone) — 같은 사람이 한 달에 여러 번 신청한 건을 1건으로 본다.
--      dedup 범위는 '달 안'이다(GROUP BY 로 월을 나눈 뒤 DISTINCT). 5월·6월에 각각 신청했으면 각 달 1건.
--
-- ⚠️ 스냅샷 소스면 마지막 등록일 이후 구간이 조용히 비어 나온다 — 호출부에서 반드시 확인할 것
--    (last-reg-date.sql).
SELECT CAST(substr(reg_date, 1, 4) AS INTEGER) AS "yr",
       CAST(substr(reg_date, 6, 2) AS INTEGER) AS "mo",
       COUNT(DISTINCT phone)                   AS "cnt"
  FROM consultations
 WHERE category = 'COUNSELONLINE'
   AND del_tf = 'N'
   AND exam_type = '5'
   AND reg_date >= :from
   AND reg_date <  date(:to, '+1 day')
 GROUP BY substr(reg_date, 1, 4), substr(reg_date, 6, 2)
 ORDER BY "yr", "mo"
