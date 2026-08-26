-- 온라인 예약 구성요소 ③ 홈페이지 — 일별(주차 레포트용). [SQLite 스냅샷]
-- select-monthly-list-raw.sql 의 일별 버전. 필터·계산 동일하고 버킷만 월→일이다.
-- ⚠️ 스냅샷 소스면 마지막 등록일 이후 구간이 조용히 비어 나온다 — 호출부에서 반드시 확인할 것
--    (select-last-reg-date.sql).
SELECT substr(reg_date, 1, 10) AS "d",
       COUNT(*)                AS "cnt"
  FROM consultations
 WHERE category = 'COUNSELONLINE'
   AND del_tf = 'N'
   AND COALESCE(name, '') NOT LIKE '%테스트%'
   AND COALESCE(name, '') NOT LIKE '%TEST%'
   AND reg_date >= :from
   AND reg_date <  date(:to, '+1 day')
 GROUP BY substr(reg_date, 1, 10)
 ORDER BY "d"
