-- 예약자 리스트_홈페이지 — 마트에서 조회. [postgres-mart]
--
-- 결과 별칭 14개는 소스판(sql/homepage/{sqlite,mariadb}/select-reservation-list-homepage.sql)과
-- 동일해야 한다 — 프론트 zod 계약. 한쪽만 고치지 말 것.
--
-- 원본 화면 동작(strategy §2 결정 3):
--   1) 종료일 반개구간 — reg_date <  (to + 1일). MariaDB 판과 동일한 규약.
--   2) ORDER BY legacy_no DESC — 등록일이 아니라 PK 역순 (원본 online_list.php 유지).
--
-- 카테고리(CATEGORY='COUNSELONLINE')·삭제(DEL_TF='N') 필터는 배치가 이미 소스에서 걸러
-- 마트에는 조회 대상만 들어와 있다 — 여기서 다시 걸지 않는다.
--
-- 회귀 기준: from=2026-06-01 / to=2026-06-30 → 206건 (소스판과 동일한 값이 나와야 한다).
SELECT
    legacy_no                                              AS "legacyNo",
    COALESCE(device_type, '')                              AS "deviceType",
    COALESCE(name, '')                                     AS "name",
    COALESCE(phone, '')                                    AS "phone",
    COALESCE(reserve_date, '')                             AS "reserveDate",
    COALESCE(reserve_time, '')                             AS "reserveTime",
    COALESCE(utm_source, '')                               AS "utmSource",
    COALESCE(utm_medium, '')                               AS "utmMedium",
    COALESCE(utm_campaign, '')                             AS "utmCampaign",
    COALESCE(referral_code, '')                            AS "referralCode",
    COALESCE(exam_type, '')                                AS "examType",
    COALESCE(surgery_tf, '')                               AS "surgeryTf",
    COALESCE(is_reserve, '')                               AS "isReserve",
    TO_CHAR(reg_date, 'YYYY-MM-DD HH24:MI:SS')             AS "regDate"
  FROM mart_list_reservation_homepage
 WHERE reg_date >= CAST(:from AS TIMESTAMP)
   AND reg_date <  CAST(:to   AS TIMESTAMP) + INTERVAL '1 day'
 ORDER BY CAST(legacy_no AS BIGINT) DESC
