-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/reservation/list/select-reservation-list.sql
-- 이관 이력: 2026-09-30 A6 (ReservationMartJob 배치 read-side · list_reservation).
--
-- 방언 변환 요약:
--   테이블: RESERVATION·OPERATIONDATA·Cataract_Operationdata·COSTPRICE·EXAM·EMPLOYEE·
--          MOTIVE_NEW02·DB_CUSTOM → raw.raw_crm_<lower>
--   ISNULL → COALESCE · WITH(NOLOCK) 제거 · N'..' → '..'
--   OUTER APPLY (SELECT TOP 1) → LEFT JOIN LATERAL (... LIMIT 1) ON true
--   OUTER APPLY (SELECT ...) → CROSS JOIN LATERAL (SELECT ...) (컴퓨트-only)
--   CONVERT(varchar(10), r.InsertedDateTime, 23) → TO_CHAR(r.inserteddatetime, 'YYYY-MM-DD')
--   CONVERT(varchar(5),  r.InsertedDateTime, 108) → TO_CHAR(r.inserteddatetime, 'HH24:MI')
--   CONVERT(datetime, :to) → CAST(:to AS timestamp)
--   DATEADD(DAY, 1, x) → x + interval '1 day'
--   CHARINDEX(a, b) → POSITION(a IN b)  -- 둘 다 1-based, 0=not found
--   CHARINDEX(a, b, start) → Postgres 는 3-arg 없음. 아래 패턴으로:
--     POSITION(a IN SUBSTRING(b FROM start)) + start - 1  (POSITION 결과가 0 이 아닐 때만)
--     원본은 b + delimiter 로 감싸 항상 hit → 이 코드도 || delim 로 보존
--   CHAR(13)/CHAR(10) → CHR(13)/CHR(10)
--   SUBSTRING(str, s, l) → SUBSTRING(str FROM s FOR l)
--   SELECT MIN(v) FROM (VALUES ...) → LEAST(a, b, c, d)  -- 4개 모두 > 0 이라 안전
--   문자열 + → ||
--
-- ⚠️ alias double-quote 필수 (Writer 가 row.get("registeredAt") case-sensitive).
-- ⚠️ InsertedDateTime → inserteddatetime (folding).
-- ⚠️ 성능: 15+ LATERAL + 메모 파싱 CHARINDEX 체인. §10.1 인덱스 반영 후 실 검증 필요.
--
SELECT
  TO_CHAR(r.inserteddatetime, 'YYYY-MM-DD')                AS "registeredAt",
  COALESCE(TO_CHAR(r.inserteddatetime, 'HH24:MI'), '')     AS "registeredTime",
  COALESCE(r.reserve_date, '')                             AS "reserveDate",
  COALESCE(LTRIM(RTRIM(r.start_time)), '')                 AS "reserveTime",
  COALESCE(LTRIM(RTRIM(r.cust_num)), '')                   AS "chartNo",
  COALESCE(r.cust_name, '')                                AS "name",
  REPLACE(REPLACE(COALESCE(r.call_num2, ''), '-', ''), ' ', '') AS "hp",
  LOWER(LTRIM(RTRIM(COALESCE(r.email, ''))))               AS "email",
  COALESCE(r.reserve_state, '')                            AS "reserveState",
  CASE
    WHEN r.reserve_path = 'CTI' THEN '인콜'
    WHEN r.reserve_path = 'CRM' THEN '아웃콜'
    WHEN r.reserve_path = 'ONLINE' THEN '홈페이지'
    WHEN r.reserve_path = 'APP' THEN '앱'
    WHEN r.reserve_path = 'NAVER' THEN '네이버'
    WHEN r.reserve_path = 'KAKAO' THEN '카카오'
    ELSE COALESCE(r.reserve_path, '')
  END                                                       AS "channel",
  CASE
    WHEN r.reserve_path IN ('CTI', 'CRM') THEN '콜'
    WHEN r.reserve_path IN ('ONLINE', 'APP', 'NAVER', 'KAKAO') THEN '온라인'
    ELSE '기타'
  END                                                       AS "channelGroup",
  COALESCE(doc.emp_name, '')                                AS "doctor",
  COALESCE(cns.emp_name, '')                                AS "counselor",
  COALESCE(r.comment, '')                                   AS "comment",
  -- 내원동기(중/대) — CRM > 메모 정형 > 메모 비정형 순 fallback. tmdb 광고는 최우선.
  CASE WHEN tmdb.hit = 1 THEN '광고'
       WHEN COALESCE(mv."motiveM", '') <> '' THEN COALESCE(mv."motiveL", '')
       ELSE COALESCE(resolvedMemoMv."motiveL", '') END      AS "motiveL",
  CASE WHEN tmdb.hit = 1 THEN '모두닥'
       ELSE COALESCE(NULLIF(mv."motiveM", ''), COALESCE(resolvedMemoMv."motiveM", '')) END AS "motiveM",
  CASE WHEN tmdb.hit = 1 THEN 'TMDB'
       WHEN COALESCE(mv."motiveM", '') <> '' THEN 'CRM'
       WHEN COALESCE(resolvedMemoMv."motiveM", '') <> '' THEN 'MEMO'
       ELSE '' END                                          AS "motiveMSource",
  COALESCE(ex."examDate", '')                               AS "examRegDate",
  CASE WHEN ex."stopYn" = 'Y' THEN 'Y'
       WHEN ex."examDate" IS NULL THEN ''
       ELSE 'N' END                                         AS "examStop",
  COALESCE(sx."regDate", '')                                AS "surgeryRegDate",
  COALESCE(sg."opR", '')                                    AS "surgeryR",
  COALESCE(sg."opL", '')                                    AS "surgeryL",
  COALESCE(sg."opDate", '')                                 AS "surgeryDate",
  COALESCE(pay.receipt, 0)                                  AS "surgeryPayment"
FROM raw.raw_crm_reservation r
LEFT JOIN LATERAL (
  SELECT u."opDate", u."opR", u."opL"
  FROM (
    SELECT op.operation_date AS "opDate",
           COALESCE(op.operationr, '') AS "opR",
           COALESCE(op.operationl, '') AS "opL"
    FROM raw.raw_crm_operationdata op
    WHERE op.cust_num = r.cust_num
      AND op.operation_date >= COALESCE(NULLIF(r.reserve_date, ''), '9999-12-31')
      AND ( (COALESCE(op.operationr, '') <> '' AND op.operationr NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST'))
         OR (COALESCE(op.operationl, '') <> '' AND op.operationl NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST')) )
    UNION ALL
    SELECT c.operationr_date, COALESCE(c.operationr, ''), ''
    FROM raw.raw_crm_cataract_operationdata c
    WHERE c.cust_num = r.cust_num
      AND COALESCE(c.operationr_date, '') <> ''
      AND COALESCE(c.operationr, '') NOT IN ('', 'X', 'OP불가', 'TEST-TEST')
      AND c.operationr_date >= COALESCE(NULLIF(r.reserve_date, ''), '9999-12-31')
    UNION ALL
    SELECT c.operationl_date, '', COALESCE(c.operationl, '')
    FROM raw.raw_crm_cataract_operationdata c
    WHERE c.cust_num = r.cust_num
      AND COALESCE(c.operationl_date, '') <> ''
      AND COALESCE(c.operationl, '') NOT IN ('', 'X', 'OP불가', 'TEST-TEST')
      AND c.operationl_date >= COALESCE(NULLIF(r.reserve_date, ''), '9999-12-31')
  ) u
  ORDER BY u."opDate"
  LIMIT 1
) sg ON true
LEFT JOIN LATERAL (
  SELECT SUM(COALESCE(cp.cost_price, 0)) AS receipt
  FROM raw.raw_crm_costprice cp
  WHERE cp.cust_num = r.cust_num
    AND cp.cost_date = sg."opDate"
    AND UPPER(COALESCE(cp.paystt, '')) <> 'A'
) pay ON true
LEFT JOIN LATERAL (
  SELECT e.exam_date AS "examDate",
         COALESCE(LTRIM(RTRIM(e.stop_yn)), '') AS "stopYn"
  FROM raw.raw_crm_exam e
  WHERE e.cust_num = r.cust_num
    AND e.exam_date >= COALESCE(NULLIF(r.reserve_date, ''), '9999-12-31')
  ORDER BY e.exam_date
  LIMIT 1
) ex ON true
LEFT JOIN LATERAL (
  SELECT TO_CHAR(op.inserteddatetime, 'YYYY-MM-DD') AS "regDate"
  FROM raw.raw_crm_reservation op
  WHERE op.cust_num = r.cust_num
    AND op.reserve_flag = 'O'
    AND op.reserve_state <> 'C'
    AND TO_CHAR(op.inserteddatetime, 'YYYY-MM-DD') >= COALESCE(NULLIF(r.reserve_date, ''), '9999-12-31')
  ORDER BY op.inserteddatetime
  LIMIT 1
) sx ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(m2.category01_name, '') AS "motiveL",
         COALESCE(m2.category02_name, '') AS "motiveM"
  FROM raw.raw_crm_motive_new02 m2
  WHERE m2.cust_num = r.cust_num AND m2.idx = '1'
  ORDER BY m2.pkey DESC
  LIMIT 1
) mv ON true
-- 메모 파싱 — TM고객(대분류/중분류) 또는 CTI고객(...) 정형 문구 추출.
-- MSSQL CHARINDEX(pat, str, start) 는 Postgres 3-arg 없음 → POSITION(pat IN SUBSTRING(str FROM start)) + (start - 1) 로 우회.
CROSS JOIN LATERAL (
  SELECT POSITION('TM고객('  IN COALESCE(r.comment, '')) AS "tmPos",
         POSITION('CTI고객(' IN COALESCE(r.comment, '')) AS "ctiPos"
) marker
CROSS JOIN LATERAL (
  SELECT (CASE
            WHEN marker."tmPos" > 0 AND (marker."ctiPos" = 0 OR marker."tmPos" < marker."ctiPos")
              THEN marker."tmPos"
            ELSE marker."ctiPos"
          END) AS pos,
         (CASE
            WHEN marker."tmPos" > 0 AND (marker."ctiPos" = 0 OR marker."tmPos" < marker."ctiPos")
              THEN 5      -- LENGTH('TM고객(') = 5
            WHEN marker."ctiPos" > 0 THEN 6  -- LENGTH('CTI고객(') = 6
            ELSE 0
          END) AS "markerLen"
) tg
CROSS JOIN LATERAL (
  -- CHARINDEX(N'/', r.COMMENT, tg.pos + tg.markerLen)
  SELECT (CASE WHEN tg.pos > 0 THEN
      COALESCE(NULLIF(POSITION('/' IN SUBSTRING(COALESCE(r.comment, '') FROM tg.pos + tg."markerLen")), 0)
               + tg.pos + tg."markerLen" - 1, 0)
    ELSE 0 END) AS sp
) tm
CROSS JOIN LATERAL (
  SELECT
    (CASE WHEN tm.sp > 0 THEN
       COALESCE(NULLIF(POSITION(')' IN SUBSTRING(COALESCE(r.comment, '') || ')' FROM tm.sp + 1)), 0)
                + tm.sp, 0)
     ELSE 0 END) AS "pClose",
    (CASE WHEN tm.sp > 0 THEN
       COALESCE(NULLIF(POSITION('/' IN SUBSTRING(COALESCE(r.comment, '') || '/' FROM tm.sp + 1)), 0)
                + tm.sp, 0)
     ELSE 0 END) AS "pSlash",
    (CASE WHEN tm.sp > 0 THEN
       COALESCE(NULLIF(POSITION(CHR(13) IN SUBSTRING(COALESCE(r.comment, '') || CHR(13) FROM tm.sp + 1)), 0)
                + tm.sp, 0)
     ELSE 0 END) AS "pCr",
    (CASE WHEN tm.sp > 0 THEN
       COALESCE(NULLIF(POSITION(CHR(10) IN SUBSTRING(COALESCE(r.comment, '') || CHR(10) FROM tm.sp + 1)), 0)
                + tm.sp, 0)
     ELSE 0 END) AS "pLf"
) tp
CROSS JOIN LATERAL (
  SELECT LEAST(tp."pClose", tp."pSlash", tp."pCr", tp."pLf") AS "pEnd"
) te
CROSS JOIN LATERAL (
  SELECT
    CASE WHEN tm.sp > 0
         THEN LTRIM(RTRIM(SUBSTRING(COALESCE(r.comment, '') FROM tm.sp + 1 FOR te."pEnd" - tm.sp - 1)))
         ELSE '' END AS "motiveM",
    -- 대분류 = 마커 뒤 첫 '/' 사이. 그 사이에 줄바꿈이 끼면 문구가 깨진 것이라 버린다.
    CASE WHEN tm.sp > tg.pos + tg."markerLen"
              AND POSITION(CHR(13) IN SUBSTRING(COALESCE(r.comment, '') FROM tg.pos + tg."markerLen" FOR tm.sp - tg.pos - tg."markerLen")) = 0
              AND POSITION(CHR(10) IN SUBSTRING(COALESCE(r.comment, '') FROM tg.pos + tg."markerLen" FOR tm.sp - tg.pos - tg."markerLen")) = 0
         THEN LTRIM(RTRIM(SUBSTRING(COALESCE(r.comment, '') FROM tg.pos + tg."markerLen" FOR tm.sp - tg.pos - tg."markerLen")))
         ELSE '' END AS "motiveL"
) memoMv
-- 직원 소개 fallback — 직원 마스터 실명이 `이름t 소개`, `직원소개` 문구와 함께.
LEFT JOIN LATERAL (
  SELECT LTRIM(RTRIM(e.emp_name)) AS "employeeName"
  FROM raw.raw_crm_employee e
  WHERE COALESCE(LTRIM(RTRIM(e.emp_name)), '') <> ''
    AND (
         POSITION(LTRIM(RTRIM(e.emp_name)) || 't 소개'  IN COALESCE(r.comment, '')) > 0
      OR POSITION(LTRIM(RTRIM(e.emp_name)) || ' t 소개' IN COALESCE(r.comment, '')) > 0
      OR (
           POSITION('직원소개' IN COALESCE(r.comment, '')) > 0
       AND POSITION(LTRIM(RTRIM(e.emp_name)) IN COALESCE(r.comment, '')) > 0
      )
    )
  ORDER BY CASE WHEN e.emp_state <> 'N' THEN 0 ELSE 1 END, e.emp_num
  LIMIT 1
) staffReferral ON true
-- 비정형 메모 fallback
CROSS JOIN LATERAL (
  SELECT
    CASE
      WHEN POSITION('모두닥'    IN COALESCE(r.comment, '')) > 0 THEN '광고'
      WHEN POSITION('크리에이트립' IN COALESCE(r.comment, '')) > 0 THEN '광고'
      WHEN COALESCE(staffReferral."employeeName", '') <> '' THEN '소개직원'
      WHEN POSITION('소개고객'  IN COALESCE(r.comment, '')) > 0 THEN '소개미확인'
      ELSE '' END AS "motiveL",
    CASE
      WHEN POSITION('모두닥'    IN COALESCE(r.comment, '')) > 0 THEN '모두닥'
      WHEN POSITION('크리에이트립' IN COALESCE(r.comment, '')) > 0 THEN '크리에이트립'
      WHEN COALESCE(staffReferral."employeeName", '') <> '' THEN staffReferral."employeeName"
      WHEN POSITION('소개고객'  IN COALESCE(r.comment, '')) > 0 THEN '소개고객'
      ELSE '' END AS "motiveM"
) fallbackMv
CROSS JOIN LATERAL (
  SELECT
    CASE WHEN COALESCE(memoMv."motiveM", '') <> '' THEN memoMv."motiveL" ELSE fallbackMv."motiveL" END AS "motiveL",
    CASE WHEN COALESCE(memoMv."motiveM", '') <> '' THEN memoMv."motiveM" ELSE fallbackMv."motiveM" END AS "motiveM"
) resolvedMemoMv
-- 텔레매니저 TM 배정 DB 대조 — 모두닥 이벤트 리드면 hit=1
LEFT JOIN LATERAL (
  SELECT 1 AS hit
  FROM raw.raw_crm_db_custom d
  WHERE d.reserve_num = r.reserve_num
    AND COALESCE(RTRIM(d.reserve_num), '') <> ''
    AND COALESCE(d.gubun, '') LIKE '%모두닥%'
  LIMIT 1
) tmdb ON true
LEFT JOIN raw.raw_crm_employee doc
  ON doc.emp_num = COALESCE(NULLIF(r.select_doc, ''), r.reserve_doc)
 AND doc.emp_state <> 'N'
LEFT JOIN raw.raw_crm_employee cns
  ON cns.emp_num = r.reserve_emp
WHERE r.inserteddatetime >= CAST(:from AS timestamp)
  AND r.inserteddatetime < CAST(:to AS timestamp) + interval '1 day'
  AND r.reserve_flag = 'M'
  AND r.reserve_jinryo IN ('', '5', '6', '7', '24', '25')
  AND NOT (r.cust_name LIKE '%테스트%' OR r.cust_name LIKE '%TEST%' OR r.cust_num = '8888888888888')
  AND r.reserve_path IN ('CTI', 'CRM', 'ONLINE', 'APP', 'NAVER')
  AND COALESCE(r.reserve_seq::text, '') NOT IN ('8', '5')
  AND COALESCE(r.comment, '') NOT LIKE '%B2B(군인)%'
  -- '재검' 제외 — 상담 안내 문구 6종을 걷어낸 뒤 남으면 진짜 재검.
  AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        COALESCE(r.comment, ''), ' ', ''),
        '재검가능성', ''), '재검사안내', ''), '재검안내', ''),
        '재검사필요', ''), '재검필요', ''), '재검사진행', '')
      NOT LIKE '%재검%'
  AND COALESCE(r.comment, '') NOT LIKE '%중복%'
  AND COALESCE(r.comment, '') NOT LIKE '%시뮬%'
  AND COALESCE(r.comment, '') NOT LIKE '%차트있음%'
ORDER BY r.inserteddatetime, r.reserve_num
