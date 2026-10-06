-- 예약자 리스트_홈페이지 · Postgres · 웨어하우스 라우팅.
-- MSSQL(MariaDB) 정본: sql/homepage/mariadb/select-reservation-list-homepage.sql — 필터 근거·회귀 기준은 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · Homepage 선제 이관 (2026-10-06).
-- raw_homepage_tbl_counsel.reg_date 는 timestamp.
SELECT
    CAST(c_no AS text)                                           AS "legacyNo",
    COALESCE(divice_type, '')                                    AS "deviceType",
    COALESCE(m_nm, '')                                           AS "name",
    COALESCE(m_phone, '')                                        AS "phone",
    COALESCE(reserve_date, '')                                   AS "reserveDate",
    COALESCE(reserve_time, '')                                   AS "reserveTime",
    COALESCE(utm_source, '')                                     AS "utmSource",
    COALESCE(utm_medium, '')                                     AS "utmMedium",
    COALESCE(utm_campaign, '')                                   AS "utmCampaign",
    COALESCE(referral_code, '')                                  AS "referralCode",
    COALESCE(exam_type, '')                                      AS "examType",
    COALESCE(surgery_tf, '')                                     AS "surgeryTf",
    COALESCE(isreserve, '')                                      AS "isReserve",
    COALESCE(TO_CHAR(reg_date, 'YYYY-MM-DD HH24:MI:SS'), '')     AS "regDate"
  FROM raw.raw_homepage_tbl_counsel
 WHERE category = 'COUNSELONLINE'
   AND del_tf = 'N'
   AND COALESCE(m_nm, '') NOT LIKE '%테스트%'
   AND COALESCE(m_nm, '') NOT LIKE '%TEST%'
   AND reg_date >= CAST(:from AS timestamp)
   AND reg_date <  CAST(:to AS date) + INTERVAL '1 day'
 ORDER BY c_no DESC
