-- 드림렌즈 장부 자동 초안 (Postgres · 웨어하우스 라우팅).
-- MSSQL 정본: sql/softcrm/etc/select-dreamlens-ledger-draft.sql — 컬럼 정본·함정·검증 근거는 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · Phase 2 (2026-09-30).
SELECT r.reserve_date                         AS "entryDate",
       RTRIM(r.cust_num)                      AS "customerNo",
       c.cust_name                            AS "customerName",
       mc.sub_name                            AS "visitTypeRaw",
       mr.emp_name                            AS "examiner",
       COALESCE(lens.lens_revenue, 0)         AS "lensRevenue",
       COALESCE(lens.lens_list_price, 0)      AS "lensListPrice",
       COALESCE(su.treatment_revenue, 0)      AS "treatmentRevenue"
FROM raw.raw_crm_reservation r
JOIN raw.raw_crm_custom c ON c.cust_num = r.cust_num
LEFT JOIN raw.raw_crm_medical_sub_cfg mc
       ON mc.reserve_flag = r.reserve_flag AND mc.sub_flag = r.reserve_jinryo
LEFT JOIN raw.raw_crm_assignlist a
       ON a.custid = r.cust_num AND a.meddate = r.reserve_date
LEFT JOIN raw.raw_crm_employee mr ON a.mrid1 = mr.emp_num
LEFT JOIN LATERAL (
    SELECT SUM(pr.prcsumprc)                 AS lens_revenue,
           SUM(pr.prcitmqty * pr.prcitmprc)  AS lens_list_price
    FROM raw.raw_crm_costprice aa
    JOIN raw.raw_crm_prcitmlst pr ON aa.cust_num = pr.prccusnum AND aa.seq = pr.prcseq
    WHERE aa.cust_num = r.cust_num
      AND aa.cost_date = r.reserve_date
      AND aa.paystt NOT IN ('a', 'A')
      AND pr.prccod IN ('F', 'I', '17')
      AND pr.prcitmprc <> 0
) lens ON TRUE
LEFT JOIN LATERAL (
    SELECT SUM(s."실수납액") AS treatment_revenue
    FROM raw.raw_emr_paosunab s
    WHERE RTRIM(s.ptntidno) = RTRIM(r.cust_num)
      AND s."수납일자" = r.reserve_date
) su ON TRUE
WHERE r.reserve_date >= :from
  AND r.reserve_date <= :to
  AND r.reserve_flag = 'D'
  AND r.reserve_state IN ('I', 'H')
  AND NOT (
        COALESCE(c.cust_name, '') LIKE '%테스트%'
     OR LOWER(COALESCE(c.cust_name, '')) LIKE '%test%'
  )
ORDER BY r.reserve_date, RTRIM(r.cust_num)
