-- 예약 월별 집계 (수술/외래/드림렌즈) · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/softcrm/reservation/select-monthly-by-type.sql — 의미·필터 근거는 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE wave (2026-10-06).
-- RESERVE_FLAG: O=수술, D=드림렌즈 · RESERVE_JINRYO: 2=외래.
-- raw.raw_crm_reservation.reserve_date 는 varchar(YYYY-MM-DD) — 문자열 비교로 범위 필터, SUBSTRING 으로 yr/mo 추출.
SELECT
    SUBSTRING(r.reserve_date FROM 1 FOR 4)::int AS yr,
    SUBSTRING(r.reserve_date FROM 6 FOR 2)::int AS mo,
    SUM(CASE WHEN r.reserve_flag = 'O' THEN 1 ELSE 0 END) AS surgery,
    SUM(CASE WHEN r.reserve_jinryo = '2' THEN 1 ELSE 0 END) AS outpatient,
    SUM(CASE WHEN r.reserve_flag = 'D' THEN 1 ELSE 0 END) AS dreamlens
FROM raw.raw_crm_reservation r
WHERE r.reserve_date >= :from AND r.reserve_date <= :to
    AND r.reserve_state <> 'C'
GROUP BY SUBSTRING(r.reserve_date FROM 1 FOR 4), SUBSTRING(r.reserve_date FROM 6 FOR 2)
ORDER BY SUBSTRING(r.reserve_date FROM 1 FOR 4), SUBSTRING(r.reserve_date FROM 6 FOR 2)
