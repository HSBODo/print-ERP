-- 검사자 chart_no 셋의 O 예약 요약 — MSSQL 실시간 조회 (미래 예약 포함).
--
-- 왜 이 SQL 이 필요한가.
--   Primary 리스트(list_reservation_all) 는 배치 target range 로 잘려 담겨 미래 예약을 못 봄.
--   예약률·상담성공률은 검사자가 나중에 잡은 O 예약도 세야 정합. 그래서 이 지표들만
--   배치 시점에 MSSQL 을 실시간으로 붙어 chart_no 별 O 예약 요약을 넘겨받는다.
--
-- 반환 (chart_no 당 1행):
--   chartNo         고객번호
--   minOAny         모든 O 예약(state<>'C')의 최소 예약일 — VARCHAR YYYY-MM-DD
--   maxOAny         상동 최대
--   minOCataract    JINRYO='4' (백내장 수술) O 예약의 최소 예약일
--   maxOCataract    상동 최대
--
-- 사용처 (Java 판정 규칙):
--   시력교정 예약률   : has any O   ↔ maxOAny is not null
--   시력교정 상담성공 : has any O   ↔ maxOAny is not null
--   백내장 예약률     : has O(4) with date >= firstExamDate ↔ maxOCataract >= firstExamDate
--   백내장 상담성공   : has any O(4) ↔ maxOCataract is not null
--
-- ⚠️ MSSQL 2014 호환. RESERVE_DATE 는 VARCHAR YYYY-MM-DD 라 lexicographic MIN/MAX 가 그대로 날짜 정합.
-- ⚠️ :chartNos 는 NamedParameterJdbcTemplate 의 IN-list 확장. 큰 셋은 호출측에서 청크로 잘라 호출.
SELECT
    r.CUST_NUM AS chartNo,
    MIN(CASE WHEN r.RESERVE_FLAG='O' AND r.RESERVE_STATE<>'C' THEN r.RESERVE_DATE END)                                  AS minOAny,
    MAX(CASE WHEN r.RESERVE_FLAG='O' AND r.RESERVE_STATE<>'C' THEN r.RESERVE_DATE END)                                  AS maxOAny,
    MIN(CASE WHEN r.RESERVE_FLAG='O' AND r.RESERVE_JINRYO='4' AND r.RESERVE_STATE<>'C' THEN r.RESERVE_DATE END)          AS minOCataract,
    MAX(CASE WHEN r.RESERVE_FLAG='O' AND r.RESERVE_JINRYO='4' AND r.RESERVE_STATE<>'C' THEN r.RESERVE_DATE END)          AS maxOCataract
  FROM RESERVATION r WITH(NOLOCK)
 WHERE r.CUST_NUM IN (:chartNos)
   AND r.RESERVE_FLAG = 'O'
   AND r.RESERVE_STATE <> 'C'
 GROUP BY r.CUST_NUM
