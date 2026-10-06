-- 예약 종합 월별 (콜+온라인) · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/softcrm/reservation/overall/select-monthly.sql — 운영 기준·공통 제외는 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE wave 2 (2026-10-06).
-- ReservationReconcileService 전용(파이프라인 밖). inserteddatetime 은 timestamp.
SELECT EXTRACT(YEAR FROM r.inserteddatetime)::int  AS yr,
       EXTRACT(MONTH FROM r.inserteddatetime)::int AS mo,
       COUNT(DISTINCT CASE WHEN (r.reserve_path IN ('CTI', 'CRM'))
                             OR r.reserve_path IN ('ONLINE', 'APP', 'NAVER')
                           THEN r.reserve_num END) AS cnt,
       COUNT(DISTINCT CASE WHEN r.reserve_path IN ('ONLINE', 'APP', 'NAVER')
                           THEN r.reserve_num END) AS online_cnt,
       COUNT(DISTINCT CASE WHEN r.reserve_path IN ('CTI', 'CRM') THEN r.reserve_num END) AS call_cnt
FROM raw.raw_crm_reservation r
WHERE r.inserteddatetime >= CAST(:from AS timestamp)
  AND r.inserteddatetime <= CAST(:to AS timestamp)
  AND r.reserve_flag = 'M'
  AND r.reserve_jinryo IN ('', '5', '6', '7', '24', '25')
  AND NOT (r.cust_name LIKE '%테스트%' OR r.cust_name LIKE '%TEST%' OR r.cust_num = '8888888888888')
  AND (COALESCE(CAST(r.reserve_seq AS varchar), '') NOT IN ('8', '5')
    AND COALESCE(r.comment, '') NOT LIKE '%B2B(군인)%' AND COALESCE(r.comment, '') NOT LIKE '%재검%'
    AND COALESCE(r.comment, '') NOT LIKE '%중복%' AND COALESCE(r.comment, '') NOT LIKE '%시뮬%'
    AND COALESCE(r.comment, '') NOT LIKE '%차트있음%'
    )
GROUP BY EXTRACT(YEAR FROM r.inserteddatetime), EXTRACT(MONTH FROM r.inserteddatetime)
ORDER BY yr, mo
