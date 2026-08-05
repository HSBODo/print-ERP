-- 드림렌즈 장부 자동 초안 — 기간 내 렌즈센터(D) 내원 1건 = 초안 1행.
-- 레거시 BCRM "통계_드림렌즈" 화면 쿼리에서 장부에 필요한 것만 추린 축약판.
--
-- 소스 3곳 (2026-08-05 prod 실측으로 시드 장부 10행과 대조 검증):
--   RESERVATION(D, I/H)                : 내원일·고객·진료구분(신규/FU/재구매·하드·MiSight)
--   AssignList.MRID1 → EMPLOYEE       : 검안사 (시드 examiner 5명 전원 MRID1 로 일치)
--   COSTPRICE+PrcItmLst (F/I/17)      : 렌즈 대금 — PrcSumPrc(실수납) 합
--   [220.85.109.240].IPLUS..PAOSUNAB  : 진료비 — 실수납액 (시드 5명 40,400/30,400/44,300/41,800 일치)
--
-- ⚠️ 함정
--   * PayStt 는 CS 컬레이션이라 소문자 'a' 필터로는 'A'(취소)가 안 걸러진다 → NOT IN ('a','A').
--     또한 정가(PrcItmQty*PrcItmPrc)로 합치면 취소행이 이중 계상된다(레거시 25.02.01 수정 사유)
--     → 반드시 PrcSumPrc(실수납) 합을 쓴다. 정가와 다를 수 있음(예: 할인 30만→25만).
--   * PAOSUNAB 은 (PTNTIDNO, 수납일자, 일련번호) 다건 가능 → OUTER APPLY SUM.
--   * 링크드서버(.240)가 죽으면 이 쿼리 전체가 실패한다 — 호출측(ImportService)이
--     REQUIRES_NEW 트랜잭션 + try-catch 로 격리해 ETC 도메인의 다른 적재를 지킨다.
--   * 같은 고객이 같은 날 D 예약 2건이면 2행이 나온다 → Java 쪽에서 (고객,날짜) 첫 행만 쓴다.
SELECT r.RESERVE_DATE                AS entryDate,
       RTRIM(r.CUST_NUM)            AS customerNo,
       c.CUST_NAME                  AS customerName,
       mc.SUB_NAME                  AS visitTypeRaw,
       mr.EMP_NAME                  AS examiner,
       ISNULL(lens.lensRevenue, 0)  AS lensRevenue,
       ISNULL(su.treatmentRevenue, 0) AS treatmentRevenue
FROM RESERVATION r WITH (NOLOCK)
JOIN CUSTOM c WITH (NOLOCK) ON c.CUST_NUM = r.CUST_NUM
LEFT JOIN MEDICAL_SUB_CFG mc
       ON mc.RESERVE_FLAG = r.RESERVE_FLAG AND mc.SUB_FLAG = r.RESERVE_JINRYO
LEFT JOIN AssignList a WITH (NOLOCK)
       ON a.custid = r.CUST_NUM AND a.MedDate = r.RESERVE_DATE
LEFT JOIN EMPLOYEE mr WITH (NOLOCK) ON a.MRID1 = mr.EMP_NUM
OUTER APPLY (
    SELECT SUM(pr.PrcSumPrc) AS lensRevenue
    FROM COSTPRICE aa WITH (NOLOCK)
    JOIN PrcItmLst pr ON aa.CUST_NUM = pr.PrcCusNum AND aa.SEQ = pr.PrcSeq
    WHERE aa.CUST_NUM = r.CUST_NUM
      AND aa.COST_DATE = r.RESERVE_DATE
      AND aa.PayStt NOT IN ('a', 'A')
      AND pr.PrcCod IN ('F', 'I', '17')
      AND pr.PrcItmPrc <> 0
) lens
OUTER APPLY (
    SELECT SUM(s.실수납액) AS treatmentRevenue
    FROM [220.85.109.240].IPLUS.dbo.PAOSUNAB s
    WHERE RTRIM(s.PTNTIDNO) = RTRIM(r.CUST_NUM)
      AND s.수납일자 = r.RESERVE_DATE
) su
WHERE r.RESERVE_DATE >= :from
  AND r.RESERVE_DATE <= :to
  AND r.RESERVE_FLAG = 'D'
  AND r.RESERVE_STATE IN ('I', 'H')
  AND NOT (
        ISNULL(c.CUST_NAME, '') LIKE N'%테스트%'
     OR LOWER(ISNULL(c.CUST_NAME, '')) LIKE '%test%'
  )
ORDER BY r.RESERVE_DATE, RTRIM(r.CUST_NUM)
