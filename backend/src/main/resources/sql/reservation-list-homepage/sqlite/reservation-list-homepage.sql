-- 예약자 리스트_홈페이지 — 레거시 관리자 화면 counsel/online_list.php(SCR-39) 목록 재현.
--
-- 소스: 레거시 홈페이지 상담 테이블(원본 TBL_COUNSEL)의 온라인 예약 채널.
--       로컬 SQLite 캐시는 원본을 snake_case 로 개명해 적재했다(M_NM→name, ISCALL→is_call 등).
-- 방언: SQLite. reg_date 는 '날짜 공백 시각' 형태의 TEXT 라 문자열 비교로 기간을 자른다.
--
-- 레거시 원본 동작을 그대로 따르는 지점(바꾸면 건수가 달라진다):
--   1) category='COUNSELONLINE' — 7개 상담 채널이 한 테이블에 있어 이 필터를 빼면
--      전화상담 등이 섞인다(2026-06 기준 206 → 753).
--   2) del_tf='N' — 레거시 PHP 에 하드코딩. 삭제건(전체 281건)은 화면 조회 대상이 아니다.
--   3) 종료일 반개구간 — 레거시는 종료일 문자열에 그날의 마지막 시각을 덧붙여 비교한다.
--      여기서는 < (종료일 + 1일) 로 명시 처리한다. 이 처리를 빼면 종료일이 자정으로
--      해석돼 그날 등록분이 통째로 날아간다(2026-06 기준 206 → 199). 가이드 6장 함정 7.
--   4) ORDER BY legacy_no DESC — 등록일이 아니라 PK(C_NO) 역순이다.
--
-- 회귀 기준: from=2026-06-01 / to=2026-06-30 → 206건 (운영 화면 동일 조건과 같은 값).
SELECT
    CAST(legacy_no AS TEXT)          AS "legacyNo",
    COALESCE(device_type, '')        AS "deviceType",
    COALESCE(name, '')               AS "name",
    COALESCE(phone, '')              AS "phone",
    COALESCE(reserve_date, '')       AS "reserveDate",
    COALESCE(reserve_time, '')       AS "reserveTime",
    COALESCE(utm_source, '')         AS "utmSource",
    COALESCE(utm_medium, '')         AS "utmMedium",
    COALESCE(utm_campaign, '')       AS "utmCampaign",
    COALESCE(referral_code, '')      AS "referralCode",
    COALESCE(exam_type, '')          AS "examType",
    COALESCE(surgery_tf, '')         AS "surgeryTf",
    COALESCE(is_reserve, '')         AS "isReserve",
    COALESCE(reg_date, '')           AS "regDate"
  FROM consultations
 WHERE category = 'COUNSELONLINE'
   AND del_tf = 'N'
   AND reg_date >= :from
   AND reg_date <  date(:to, '+1 day')
 ORDER BY legacy_no DESC
