
-- O 예약 요약 (Postgres · 웨어하우스 라우팅).
-- MSSQL 정본: sql/softcrm/consultation/select-o-reservation-summary-by-charts.sql — 계약·반환 컬럼은 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · Phase 2 (2026-09-30).
SELECT
    r.cust_num AS "chartNo",
    MIN(CASE WHEN r.reserve_flag='O' AND r.reserve_state<>'C' THEN r.reserve_date END)                                  AS "minOAny",
    MAX(CASE WHEN r.reserve_flag='O' AND r.reserve_state<>'C' THEN r.reserve_date END)                                  AS "maxOAny",
    MIN(CASE WHEN r.reserve_flag='O' AND r.reserve_jinryo='4' AND r.reserve_state<>'C' THEN r.reserve_date END)          AS "minOCataract",
    MAX(CASE WHEN r.reserve_flag='O' AND r.reserve_jinryo='4' AND r.reserve_state<>'C' THEN r.reserve_date END)          AS "maxOCataract"
  FROM raw.raw_crm_reservation r
 WHERE r.cust_num IN (:chartNos)
   AND r.reserve_flag = 'O'
   AND r.reserve_state <> 'C'
 GROUP BY r.cust_num
