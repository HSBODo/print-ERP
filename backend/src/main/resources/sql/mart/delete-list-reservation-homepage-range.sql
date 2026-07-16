-- 마트 범위 삭제 — 재배치 시 취소·수정분까지 반영하려는 delete+insert 패턴.
-- reg_date 는 TIMESTAMP 라 to 는 다음 날 자정을 포함하지 않도록 반개구간(< to+1) 으로 자른다
-- (원본 MariaDB SELECT 와 규약 일치).
DELETE FROM mart_list_reservation_homepage
 WHERE reg_date >= CAST(:from AS TIMESTAMP)
   AND reg_date <  CAST(:to   AS TIMESTAMP) + INTERVAL '1 day'
