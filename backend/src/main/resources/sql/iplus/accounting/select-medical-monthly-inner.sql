-- 진료 매출 월별 집계 — 의사랑(IPLUS) 외래·입원 수납 원장 + PAYTRANS + NHICM4AP 를 월(ym)별로 접는다.
--
-- ⚠️ OPENQUERY 안쪽 쿼리 (OpenQuerySql 이 감싼다 · __OQ_FROM__/__OQ_TO__ 치환 · 8,000자 상한).
--
-- 회계 원형(디렉팅/회계/_build-monthly.js) 의 5개 쿼리를 UNION ALL 한 줄로 합친 것. src 로 구분한다.
--   out / in : 수납 원장 월합 (건수·수납할금액·청구액·급여총액·비급여액·할인액)
--              2026-01-01 부터는 _New 테이블(백대백 항목 추가 체계), 그 전 연도는 구 테이블에만 데이터가 있다.
--   pt       : PAYTRANS 수납일자 기준 — 미수회수(91·92·93)=v1, 환불금(81·82)=v2, 미수발생(90)=v3
--   pt80     : PAYTRANS 진료일자 기준 — 환불발생(80)=v1
--   gs       : NHICM4AP [date] 기준 — 건생비(cfhcDmdAmt)=v1
-- 실수납합계(레거시 공식) = 수납할금액 + 미수회수 − 미수발생 − 환불금 − 건생비 + 환불발생 (Java 에서 합산).
SELECT 'out' AS src, LEFT(수납일자,7) AS ym, COUNT(*) AS cnt,
       SUM(CAST(수납할금액 AS BIGINT)) AS v1, SUM(CAST(청구액 AS BIGINT)) AS v2,
       SUM(CAST(급여총액 AS BIGINT)) AS v3, SUM(CAST(비급여액 AS BIGINT)) AS v4, SUM(CAST(할인액 AS BIGINT)) AS v5
FROM IPLUS.dbo.PAOSUNAB
WHERE 수납일자 >= '__OQ_FROM__' AND 수납일자 <= '__OQ_TO__' AND 수납일자 < '2026-01-01'
GROUP BY LEFT(수납일자,7)
UNION ALL
SELECT 'out', LEFT(수납일자,7), COUNT(*),
       SUM(CAST(수납할금액 AS BIGINT)), SUM(CAST(청구액 AS BIGINT)),
       SUM(CAST(급여총액 AS BIGINT)), SUM(CAST(비급여액 AS BIGINT)), SUM(CAST(할인액 AS BIGINT))
FROM IPLUS.dbo.PAOSUNAB_New
WHERE 수납일자 >= '__OQ_FROM__' AND 수납일자 <= '__OQ_TO__' AND 수납일자 >= '2026-01-01'
GROUP BY LEFT(수납일자,7)
UNION ALL
SELECT 'in', LEFT(입원일자,7), COUNT(*),
       SUM(CAST(수납할금액 AS BIGINT)), SUM(CAST(청구액 AS BIGINT)),
       SUM(CAST(급여총액 AS BIGINT)), SUM(CAST(비급여액 AS BIGINT)), SUM(CAST(할인액 AS BIGINT))
FROM IPLUS.dbo.PAISUNAB
WHERE 입원일자 >= '__OQ_FROM__' AND 입원일자 <= '__OQ_TO__' AND 입원일자 < '2026-01-01'
GROUP BY LEFT(입원일자,7)
UNION ALL
SELECT 'in', LEFT(입원일자,7), COUNT(*),
       SUM(CAST(수납할금액 AS BIGINT)), SUM(CAST(청구액 AS BIGINT)),
       SUM(CAST(급여총액 AS BIGINT)), SUM(CAST(비급여액 AS BIGINT)), SUM(CAST(할인액 AS BIGINT))
FROM IPLUS.dbo.PAISUNAB_New
WHERE 입원일자 >= '__OQ_FROM__' AND 입원일자 <= '__OQ_TO__' AND 입원일자 >= '2026-01-01'
GROUP BY LEFT(입원일자,7)
UNION ALL
SELECT 'pt', LEFT(수납일자,7), 0,
       SUM(CASE WHEN 결제구분 IN ('91','92','93') THEN CAST(승인금액 AS BIGINT) ELSE 0 END),
       SUM(CASE WHEN 결제구분 IN ('81','82') THEN CAST(승인금액 AS BIGINT) ELSE 0 END),
       SUM(CASE WHEN 결제구분 = '90' THEN CAST(승인금액 AS BIGINT) ELSE 0 END), 0, 0
FROM IPLUS.dbo.PAYTRANS
WHERE 수납일자 >= '__OQ_FROM__' AND 수납일자 <= '__OQ_TO__'
GROUP BY LEFT(수납일자,7)
UNION ALL
SELECT 'pt80', LEFT(진료일자,7), 0, SUM(CAST(승인금액 AS BIGINT)), 0, 0, 0, 0
FROM IPLUS.dbo.PAYTRANS
WHERE 결제구분 = '80' AND 진료일자 >= '__OQ_FROM__' AND 진료일자 <= '__OQ_TO__'
GROUP BY LEFT(진료일자,7)
UNION ALL
SELECT 'gs', LEFT([date],7), 0, SUM(CONVERT(INT, cfhcDmdAmt)), 0, 0, 0, 0
FROM IPLUS.dbo.NHICM4AP
WHERE [date] >= '__OQ_FROM__' AND [date] <= '__OQ_TO__'
GROUP BY LEFT([date],7)
