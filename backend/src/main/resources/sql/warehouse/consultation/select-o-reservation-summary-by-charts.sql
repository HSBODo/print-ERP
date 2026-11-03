
-- O 예약 요약 (Postgres · 웨어하우스 라우팅).
-- MSSQL 정본: sql/softcrm/consultation/select-o-reservation-summary-by-charts.sql — 계약·반환 컬럼은 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · Phase 2 (2026-09-30).
--
-- ⚠️ TRIM 통일 전략 (2026-10-13): raw.* cust_num 은 테이블마다 varchar 길이가 다름(13/20/23/50/200).
-- CRM 원본이 char(N) 였고 데이터 플랫폼이 varchar 로 바꾸며 공백을 그대로 복사해 길이가 흩어진다.
-- Postgres varchar 비교는 trailing space 유의미하므로 TRIM 없이 비교하면 매칭 실패. 데이터 플랫폼은
-- 인덱스 추가만 가능(스키마·데이터 변경 불가) 제약이라, 우리 쪽 SQL 전부 TRIM 로 통일하고
-- raw 쪽 cust_num 에 ((TRIM(cust_num))) 표현식 인덱스를 요청해 index scan 을 보장한다.
SELECT
    TRIM(r.cust_num) AS "chartNo",
    MIN(CASE WHEN r.reserve_flag='O' AND r.reserve_state<>'C' THEN r.reserve_date END)                                  AS "minOAny",
    MAX(CASE WHEN r.reserve_flag='O' AND r.reserve_state<>'C' THEN r.reserve_date END)                                  AS "maxOAny",
    MIN(CASE WHEN r.reserve_flag='O' AND r.reserve_jinryo='4' AND r.reserve_state<>'C' THEN r.reserve_date END)          AS "minOCataract",
    MAX(CASE WHEN r.reserve_flag='O' AND r.reserve_jinryo='4' AND r.reserve_state<>'C' THEN r.reserve_date END)          AS "maxOCataract"
  FROM raw.raw_crm_reservation r
 WHERE TRIM(r.cust_num) IN (:chartNos)
   AND r.reserve_flag = 'O'
   AND r.reserve_state <> 'C'
 GROUP BY TRIM(r.cust_num)
