-- 예약 변경이력 원천 — 검사예약(M 시력교정 · D 드림렌즈 · H 백내장)의 RESERVE_HISTORY 행 전체.
--
-- 대상 예약 = 기간(:from ~ :to) 안에 이력이 한 건이라도 저장된 예약. 그 예약의 이력은 기간 밖 것까지
-- 전부 돌려준다 — 체인(최초 → 변경1 → … → 최종)은 처음부터 끝까지 있어야 기준일(시점) 조회가 된다.
-- 변경은 등록 한참 뒤에도 일어나므로 "등록일 범위" 가 아니라 "활동(이력 저장) 범위" 로 다시 읽어야
-- 늦은 변경이 마트에 반영된다. 마트(list_reservation_change)는 reserve_num 으로 upsert 한다.
--
-- 체인 접기(같은 예약일 연속 행 합치기)·등록일 3순위 산정은 Java(ReservationChangeChainBuilder)가 한다.
-- HISTORY_TIME 은 varchar 라 여기서 CONVERT 하지 않고 원문을 넘긴다 — 변환 실패 행이 배치를 죽이지 않게.
-- 정렬은 HISTORY_NUM — 앞 15자리가 저장 시각(yyMMddHHmmssSSS)이라 문자열순 = 시간순이다.
--   HISTORY_TIME 은 형식이 섞여 있어(2026-09 실측: 절반 이상이 다른 형식) 문자열 정렬을 믿을 수 없고,
--   Java 는 HISTORY_TIME 을 못 읽으면 HISTORY_NUM 의 시각을 대신 쓴다.
--
-- ⚠️ HISTORY_TIME 범위는 datetime 비교로 인덱스를 태운다 — 예약통계(select-system-daily-counts.sql)와 같은 패턴.
-- ⚠️ 제외: 테스트 이름 · 시스템 블록 행(8888…) · 미등록 더미(9999…). 취소·미내원은 포함(변경 패턴이 목적).
-- ⚠️ READ-ONLY · MSSQL 2014 호환(TRIM · STRING_AGG · TRY_CONVERT 금지).
SELECT
  RTRIM(r.RESERVE_NUM)                                       AS reserveNum,
  ISNULL(LTRIM(RTRIM(r.CUST_NUM)), '')                       AS chartNo,
  ISNULL(r.CUST_NAME, '')                                    AS name,
  ISNULL(LTRIM(RTRIM(r.RESERVE_FLAG)), '')                   AS branch,
  ISNULL(LTRIM(RTRIM(r.RESERVE_STATE)), '')                  AS reserveState,
  ISNULL(LTRIM(RTRIM(r.RESERVE_DATE)), '')                   AS finalDate,
  ISNULL(CONVERT(varchar(16), r.InsertedDateTime, 120), '')  AS insertedAt,
  ISNULL(h.HISTORY_TIME, '')                                 AS historyTime,
  ISNULL(LTRIM(RTRIM(h.RESERVE_DATE)), '')                   AS historyDate,
  RTRIM(h.HISTORY_NUM)                                       AS historyNum
FROM RESERVATION r WITH(NOLOCK)
JOIN RESERVE_HISTORY h WITH(NOLOCK) ON h.RESERVE_NUM = r.RESERVE_NUM
WHERE r.RESERVE_FLAG IN ('M', 'D', 'H')
  -- 옵티마이저가 IN 을 semi join 으로 풀지만 EXISTS 가 더 예측 가능(2026-09-11 전환).
  -- 상관 서브쿼리는 x.RESERVE_NUM = r.RESERVE_NUM 조건이 필요 — 그래야 RESERVE_HISTORY 인덱스(HISTORY_TIME) scan 후
  -- RESERVE_NUM 으로 조인 대신 IX_RESERVE_HISTORY_RESERVE_NUM 을 활용할 수 있다.
  AND EXISTS (
        SELECT 1
        FROM RESERVE_HISTORY x WITH(NOLOCK)
        WHERE x.RESERVE_NUM = r.RESERVE_NUM
          AND x.HISTORY_TIME >= CONVERT(datetime, :from)
          AND x.HISTORY_TIME <  DATEADD(DAY, 1, CONVERT(datetime, :to))
  )
  AND NOT (ISNULL(r.CUST_NAME, '') LIKE '%테스트%' OR ISNULL(r.CUST_NAME, '') LIKE '%TEST%')
  AND ISNULL(r.CUST_NUM, '') NOT LIKE '8888%'
  AND ISNULL(r.CUST_NUM, '') NOT LIKE '9999%'
ORDER BY r.RESERVE_NUM, h.HISTORY_NUM
