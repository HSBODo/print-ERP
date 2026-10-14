-- 진료 매출 월별 집계 — 외래·입원 수납 + PAYTRANS + NHICM4AP · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/iplus/accounting/select-medical-monthly-inner.sql (OPENQUERY 안쪽 쿼리).
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · A8 unblock (2026-10-06).
-- OPENQUERY 제거 — raw.raw_emr_* 직접 조회 + 네임드 바인딩 :from/:to.
-- MedicalMonthlyFolder 는 src·ym·cnt·v1~v5 소문자 키 사용 → unquoted alias.
SELECT 'out' AS src, SUBSTRING(수납일자 FROM 1 FOR 7) AS ym, COUNT(*) AS cnt,
       SUM(CAST(수납할금액 AS BIGINT)) AS v1, SUM(CAST(청구액 AS BIGINT)) AS v2,
       SUM(CAST(급여총액 AS BIGINT)) AS v3, SUM(CAST(비급여액 AS BIGINT)) AS v4, SUM(CAST(할인액 AS BIGINT)) AS v5
FROM raw.raw_emr_paosunab
WHERE 수납일자 >= :from AND 수납일자 <= :to AND 수납일자 < '2026-01-01'
GROUP BY SUBSTRING(수납일자 FROM 1 FOR 7)
UNION ALL
SELECT 'out', SUBSTRING(수납일자 FROM 1 FOR 7), COUNT(*),
       SUM(CAST(수납할금액 AS BIGINT)), SUM(CAST(청구액 AS BIGINT)),
       SUM(CAST(급여총액 AS BIGINT)), SUM(CAST(비급여액 AS BIGINT)), SUM(CAST(할인액 AS BIGINT))
FROM raw.raw_emr_paosunab_new
WHERE 수납일자 >= :from AND 수납일자 <= :to AND 수납일자 >= '2026-01-01'
GROUP BY SUBSTRING(수납일자 FROM 1 FOR 7)
UNION ALL
SELECT 'in', SUBSTRING(입원일자 FROM 1 FOR 7), COUNT(*),
       SUM(CAST(수납할금액 AS BIGINT)), SUM(CAST(청구액 AS BIGINT)),
       SUM(CAST(급여총액 AS BIGINT)), SUM(CAST(비급여액 AS BIGINT)), SUM(CAST(할인액 AS BIGINT))
FROM raw.raw_emr_paisunab
WHERE 입원일자 >= :from AND 입원일자 <= :to AND 입원일자 < '2026-01-01'
GROUP BY SUBSTRING(입원일자 FROM 1 FOR 7)
UNION ALL
SELECT 'in', SUBSTRING(입원일자 FROM 1 FOR 7), COUNT(*),
       SUM(CAST(수납할금액 AS BIGINT)), SUM(CAST(청구액 AS BIGINT)),
       SUM(CAST(급여총액 AS BIGINT)), SUM(CAST(비급여액 AS BIGINT)), SUM(CAST(할인액 AS BIGINT))
FROM raw.raw_emr_paisunab_new
WHERE 입원일자 >= :from AND 입원일자 <= :to AND 입원일자 >= '2026-01-01'
GROUP BY SUBSTRING(입원일자 FROM 1 FOR 7)
UNION ALL
SELECT 'pt', SUBSTRING(수납일자 FROM 1 FOR 7), 0,
       SUM(CASE WHEN 결제구분 IN ('91','92','93') THEN CAST(승인금액 AS BIGINT) ELSE 0 END),
       SUM(CASE WHEN 결제구분 IN ('81','82') THEN CAST(승인금액 AS BIGINT) ELSE 0 END),
       SUM(CASE WHEN 결제구분 = '90' THEN CAST(승인금액 AS BIGINT) ELSE 0 END), 0, 0
FROM raw.raw_emr_paytrans
WHERE 수납일자 >= :from AND 수납일자 <= :to
GROUP BY SUBSTRING(수납일자 FROM 1 FOR 7)
UNION ALL
SELECT 'pt80', SUBSTRING(진료일자 FROM 1 FOR 7), 0, SUM(CAST(승인금액 AS BIGINT)), 0, 0, 0, 0
FROM raw.raw_emr_paytrans
WHERE 결제구분 = '80' AND 진료일자 >= :from AND 진료일자 <= :to
GROUP BY SUBSTRING(진료일자 FROM 1 FOR 7)
UNION ALL
SELECT 'gs', SUBSTRING("date" FROM 1 FOR 7), 0, SUM(CAST(cfhcdmdamt AS INT)), 0, 0, 0, 0
FROM raw.raw_emr_nhicm4ap
WHERE "date" >= :from AND "date" <= :to
GROUP BY SUBSTRING("date" FROM 1 FOR 7)
