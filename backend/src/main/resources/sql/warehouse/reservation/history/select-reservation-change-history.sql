-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/reservation/history/select-reservation-change-history.sql
-- 이관 이력: 2026-09-29 Wave 1 (ReservationChangeMartJob 배치 read-side, 첫 진짜 파이프라인 이관).
--
-- 방언 변환 요약:
--   RESERVATION            → raw.raw_crm_reservation
--   RESERVE_HISTORY        → raw.raw_crm_reserve_history
--   ISNULL(x, y)           → COALESCE(x, y)
--   CONVERT(varchar(16), d, 120) → TO_CHAR(d, 'YYYY-MM-DD HH24:MI')
--   CONVERT(datetime, :p)  → CAST(:p AS timestamp)
--   DATEADD(DAY, 1, x)     → x + interval '1 day'
--   WITH(NOLOCK)           → 제거 (Postgres MVCC)
--
-- ⚠️ InsertedDateTime 컬럼명 표기: Postgres 기본 폴딩(unquoted → 소문자)에 맞춰 inserteddatetime 사용.
--    웨어하우스가 snake_case(inserted_date_time) 로 강제한다면 이 한 곳만 조정하면 됨.
-- ⚠️ history_time 은 varchar. Postgres 는 timestamp 직접 비교 불가.
--    ISO 형식(YYYY-MM-DD HH:MI:SS)은 문자열 정렬 = 시간 정렬이므로 직접 문자열 비교로 안전.
--    이 방식이 varchar 컬럼에 btree 인덱스가 있으면 그대로 인덱스 사용 (SUBSTRING 은 인덱스 못 태움).
--    ISO 아닌 이질 형식(예: yyyy/MM/dd) 이 섞여 있으면 false-positive 로 CTE 에 들어올 수 있지만,
--    바깥 JOIN 이 예약 단위 후처리라 결과 정합에 영향은 무시할 수준. Java Grouper 가 예약 1건 단위로 처리.
--
-- ⚠️ 성능 — MSSQL 원본은 EXISTS 상관 서브쿼리를 IX_RESERVE_HISTORY_RESERVE_NUM + HISTORY_TIME 인덱스로 semi-join 처리했지만,
--    Postgres 는 상관 서브쿼리로는 예약당 이력 전체 스캔이 폭발.
--    → 매칭 예약을 CTE 로 미리 뽑아 이력 테이블은 딱 한 번만 스캔. 결과는 동일.
WITH matched_reservations AS (
    SELECT DISTINCT reserve_num
    FROM raw.raw_crm_reserve_history
    WHERE history_time >= :from
      AND history_time <  (CAST(:to AS date) + INTERVAL '1 day')::text
)
SELECT
  RTRIM(r.reserve_num)                                            AS reserveNum,
  COALESCE(LTRIM(RTRIM(r.cust_num)), '')                          AS chartNo,
  COALESCE(r.cust_name, '')                                       AS name,
  COALESCE(LTRIM(RTRIM(r.reserve_flag)), '')                      AS branch,
  COALESCE(LTRIM(RTRIM(r.reserve_state)), '')                     AS reserveState,
  COALESCE(LTRIM(RTRIM(r.reserve_date)), '')                      AS finalDate,
  COALESCE(TO_CHAR(r.inserteddatetime, 'YYYY-MM-DD HH24:MI'), '') AS insertedAt,
  COALESCE(h.history_time, '')                                    AS historyTime,
  COALESCE(LTRIM(RTRIM(h.reserve_date)), '')                      AS historyDate,
  RTRIM(h.history_num)                                            AS historyNum
FROM raw.raw_crm_reservation r
JOIN matched_reservations mr ON mr.reserve_num = r.reserve_num
JOIN raw.raw_crm_reserve_history h ON h.reserve_num = r.reserve_num
WHERE r.reserve_flag IN ('M', 'D', 'H')
  AND COALESCE(r.cust_name, '') NOT LIKE '%테스트%'
  AND COALESCE(r.cust_name, '') NOT LIKE '%TEST%'
  AND COALESCE(r.cust_num, '') NOT LIKE '8888%'
  AND COALESCE(r.cust_num, '') NOT LIKE '9999%'
ORDER BY r.reserve_num, h.history_num
