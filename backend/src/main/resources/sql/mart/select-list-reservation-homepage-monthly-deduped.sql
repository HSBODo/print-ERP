-- 온라인 예약 구성요소 ③ 홈페이지 — 월별 중복제외 건수. [postgres-mart]
--
-- 2026-06 부터 온라인 예약 = 네이버 + 카카오톡 + 홈페이지(중복제외) 로 재정의된 계산의 홈페이지 몫.
-- 소스판(../{sqlite,mariadb}/monthly-deduped.sql) 과 결과 계약(yr·mo·cnt) 동일해야 함.
--
-- 화면 목록(select-list-reservation-homepage.sql) 과 다른 점:
--   1) exam_type='5' (시력교정) 만. 백내장(2)·노안(21)·렌즈삽입(24,25)·라벨없는 '1' 제외.
--   2) COUNT(DISTINCT phone) — 같은 사람의 같은 달 여러 신청건은 1건으로 본다(달 안 dedup).
--
-- ⚠️ 마트는 배치 이후로만 최신이라, 마지막 배치 이후 등록건은 여기 없다 — 호출부(ReservationOverallStatsService)
--    가 last-reg-date 와 함께 확인해 부분 월을 null 로 끊는다.
SELECT EXTRACT(YEAR  FROM reg_date)::INTEGER AS "yr",
       EXTRACT(MONTH FROM reg_date)::INTEGER AS "mo",
       COUNT(DISTINCT phone)                 AS "cnt"
  FROM mart_list_reservation_homepage
 WHERE exam_type = '5'
   AND reg_date >= CAST(:from AS TIMESTAMP)
   AND reg_date <  CAST(:to   AS TIMESTAMP) + INTERVAL '1 day'
 GROUP BY EXTRACT(YEAR FROM reg_date), EXTRACT(MONTH FROM reg_date)
 ORDER BY "yr", "mo"
