-- 온라인 예약 구성요소 ③ 홈페이지 — 예약자 리스트_홈페이지 화면 건수와 동일. [SQLite 스냅샷]
--
-- 2026-07-24 예약 종합·월간 레포트 모두 이 값을 참조한다 — 리스트 화면과 정합 요구를 반영.
--
-- 리스트 화면(reservation-list-homepage.sql) 과 동일한 필터·계산:
--   · exam_type 필터 없음 — 백내장(2)·노안(21)·렌즈삽입(24,25)·미상(1) 모두 포함
--   · dedup 없음         — 같은 사람 여러 신청건도 각각 카운트
--   · COUNT(*)           — 리스트가 그대로 보여주는 raw 건수
--
-- ⚠️ 네이버·카카오는 시력교정만 집계 — 이 홈페이지 판만 전 진료 포함이라 진료 범위 비대칭(의도적).
-- ../mariadb/monthly-list-raw.sql · sql/mart/select-list-reservation-homepage-monthly-list-raw.sql 과
-- 결과 계약(yr·mo·cnt) 동일해야 한다 — 한쪽만 고치지 말 것.
--
-- ⚠️ 스냅샷 소스면 마지막 등록일 이후 구간이 조용히 비어 나온다 — 호출부에서 반드시 확인할 것
--    (last-reg-date.sql).
SELECT CAST(substr(reg_date, 1, 4) AS INTEGER) AS "yr",
       CAST(substr(reg_date, 6, 2) AS INTEGER) AS "mo",
       COUNT(*)                                AS "cnt"
  FROM consultations
 WHERE category = 'COUNSELONLINE'
   AND del_tf = 'N'
   AND reg_date >= :from
   AND reg_date <  date(:to, '+1 day')
 GROUP BY substr(reg_date, 1, 4), substr(reg_date, 6, 2)
 ORDER BY "yr", "mo"
