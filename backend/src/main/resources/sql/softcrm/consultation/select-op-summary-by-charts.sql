-- 검사자 chart_no 셋의 수술 요약 — MSSQL 실시간 조회 (미래 시점 수술은 없지만 배치 range 밖도 담기 위해).
--
-- 왜 이 SQL 이 필요한가.
--   Primary 리스트(list_surgery) 도 배치 range 로 잘려 담겨서 range 밖 과거·미래 수술을 못 본다.
--   상담성공률 vision 의 actualSurgery 와 순수 외래 제외 필터가 이 수술 판정에 의존해
--   MSSQL 실시간 조회로 chart_no 별 min/max 수술일을 넘겨받는다.
--
-- 반환 (chart_no 당 1행):
--   chartNo    고객번호
--   minOpDate  최소 수술일 (VARCHAR YYYY-MM-DD)
--   maxOpDate  최대 수술일
--
-- 사용처 (Java 판정 규칙):
--   시력교정 예약률 순수외래 제외 필터 : has surgery >= exam_date ↔ maxOpDate >= exam_date
--   시력교정 상담성공률 actualSurgery   : has any surgery         ↔ maxOpDate is not null
SELECT
    od.CUST_NUM         AS chartNo,
    MIN(od.OPERATION_DATE) AS minOpDate,
    MAX(od.OPERATION_DATE) AS maxOpDate
  FROM OPERATIONDATA od WITH(NOLOCK)
 WHERE od.CUST_NUM IN (:chartNos)
   AND ISNULL(od.OPERATION_DATE, '') <> ''
 GROUP BY od.CUST_NUM
