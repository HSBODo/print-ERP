-- 예약자 리스트_홈페이지 — 레거시 관리자 화면 counsel/online_list.php(SCR-39) 목록 재현. [MariaDB · 실시간]
--
-- 소스: 레거시 운영 DB(bseyecom_db)의 TBL_COUNSEL 원본. SSH 터널 경유.
-- 같은 화면의 SQLite 스냅샷 판(../sqlite/)과 결과 계약(별칭 14개)이 동일해야 한다 — 한쪽만 고치지 말 것.
--
-- ⚠️ 스냅샷 판과 컬럼명이 다르다. 캐시는 원본을 snake_case 로 개명해 적재했다:
--      C_NO→legacy_no · M_NM→name · M_PHONE→phone · DIVICE_TYPE→device_type(원본 오타 그대로)
--    스냅샷 SQL 을 그대로 복사하면 'no such column' 이 난다.
--
-- ⚠️ 타입이 다르다 — 여기서 문자열로 맞춰 내보내야 프론트 zod(전 필드 z.string())가 통과한다.
--      C_NO     int      → CAST(... AS CHAR)
--      REG_DATE datetime → DATE_FORMAT(...) . 안 하면 JDBC 가 Timestamp 를 올려 파싱이 깨진다.
--                          (SQLite 판은 TEXT 라 그냥 나왔다)
--
-- 레거시 원본 동작을 그대로 따르는 지점(바꾸면 건수가 달라진다):
--   1) CATEGORY='COUNSELONLINE' — 7개 상담 채널이 한 테이블에 있어 빼면 전화상담 등이 섞인다
--      (2026-06 기준 206 → 753).
--   2) DEL_TF='N' — 레거시 PHP 하드코딩. 삭제건은 화면 조회 대상이 아니다.
--   3) 종료일 반개구간 — < (종료일 + 1일). 빼면 종료일이 자정으로 해석돼 그날 등록분이 통째로 날아간다
--      (2026-06 기준 206 → 199). REG_DATE 가 datetime 이라 :to('YYYY-MM-DD')는 00:00:00 으로 승격된다.
--   4) ORDER BY C_NO DESC — 등록일이 아니라 PK 역순.
--
-- 회귀 기준: from=2026-06-01 / to=2026-06-30 → 206건 (2026-07-15 운영 DB 실측으로 확인).
SELECT
    CAST(C_NO AS CHAR)                              AS `legacyNo`,
    COALESCE(DIVICE_TYPE, '')                       AS `deviceType`,
    COALESCE(M_NM, '')                              AS `name`,
    COALESCE(M_PHONE, '')                           AS `phone`,
    COALESCE(RESERVE_DATE, '')                      AS `reserveDate`,
    COALESCE(RESERVE_TIME, '')                      AS `reserveTime`,
    COALESCE(UTM_SOURCE, '')                        AS `utmSource`,
    COALESCE(UTM_MEDIUM, '')                        AS `utmMedium`,
    COALESCE(UTM_CAMPAIGN, '')                      AS `utmCampaign`,
    COALESCE(REFERRAL_CODE, '')                     AS `referralCode`,
    COALESCE(EXAM_TYPE, '')                         AS `examType`,
    COALESCE(SURGERY_TF, '')                        AS `surgeryTf`,
    COALESCE(ISRESERVE, '')                         AS `isReserve`,
    COALESCE(DATE_FORMAT(REG_DATE, '%Y-%m-%d %H:%i:%s'), '') AS `regDate`
  FROM TBL_COUNSEL
 WHERE CATEGORY = 'COUNSELONLINE'
   AND DEL_TF = 'N'
   AND REG_DATE >= :from
   AND REG_DATE <  DATE_ADD(:to, INTERVAL 1 DAY)
 ORDER BY C_NO DESC
