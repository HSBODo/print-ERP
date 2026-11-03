-- 온라인 예약 구성요소 ② 카카오톡(해피톡) · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/softcrm/reservation/overall/select-monthly-kakao.sql — 기준·dedup 근거는 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE wave 2 (2026-10-06).
-- ODBC canonical with ms (MSSQL 변환식) → TO_CHAR(x, 'YYYY-MM-DD HH24:MI:SS.MS')
SELECT EXTRACT(YEAR FROM H.inserteddatetime)::int  AS yr,
       EXTRACT(MONTH FROM H.inserteddatetime)::int AS mo,
       COUNT(DISTINCT TO_CHAR(H.inserteddatetime, 'YYYY-MM-DD HH24:MI:SS.MS')) AS kakao_cnt
FROM raw.raw_crm_happytalk_counsel_list H
INNER JOIN raw.raw_crm_happytalk_category01 C01 ON C01.seq = H.category01
LEFT JOIN raw.raw_crm_happytalk_category02 C02 ON C02.pkey = H.category02 AND C02.fkey = H.category01
WHERE H.inserteddatetime >= CAST(:from AS timestamp)
  AND H.inserteddatetime <= CAST(:to AS timestamp)
  AND C01.name = '수술전'
  AND C02.name = '★신환'
GROUP BY EXTRACT(YEAR FROM H.inserteddatetime), EXTRACT(MONTH FROM H.inserteddatetime)
ORDER BY yr, mo
