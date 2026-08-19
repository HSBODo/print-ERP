-- 재수술 후보 조회 — list_reoperation 마트에서 그대로 뽑는다.
-- 원본(sql/surgery/find-reoperation-candidates.sql) 은 대사(reconcile) 대비용으로만 유지.
--
-- 배치가 SurgeryMartJob 에서 list_reoperation 을 매일 delete+insert 하며
-- MSSQL RE_OPERATION + CUSTOM + EMPLOYEE + COSTPRICE 조합으로 이미 계산한 값을 저장한다
-- (자동판정 auto_included, 제외사유 exclude_reason 포함). 컨트롤러 계약(ReoperationCandidate)
-- 필드와 1:1 매핑.
--
-- 정렬 원본: autoIncluded DESC, excludeReason, reopDate, chartNo — 동일.
SELECT
    chart_no        AS "chartNo",
    COALESCE(name, '')          AS "name",
    COALESCE(name_eng, '')      AS "nameEng",
    COALESCE(patient_type, '')  AS "patientType",
    COALESCE(surgeon, '')       AS "surgeon",
    COALESCE(payment, '')       AS "payment",
    TO_CHAR(reop_date, 'YYYY-MM-DD') AS "reopDate",
    again_r         AS "againR",
    again_l         AS "againL",
    auto_included::int          AS "autoIncluded",
    COALESCE(exclude_reason, '')  AS "excludeReason"
  FROM list_reoperation
 WHERE reop_date >= CAST(:from AS DATE)
   AND reop_date <= CAST(:to   AS DATE)
 ORDER BY auto_included DESC, COALESCE(exclude_reason, ''), reop_date, chart_no
