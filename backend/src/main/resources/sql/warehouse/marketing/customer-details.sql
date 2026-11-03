-- 데이터 플랫폼(bnviit_datawarehouse) 버전.
-- 이관: 2026-10-07 QUERY_DIRECT #2 (OverseasMarketing)
--
-- 참조 raw 테이블:
--   raw.raw_crm_custom_history  (CUSTOM_HISTORY — 고객 최초 등록일)
--   raw.raw_crm_lens            (LENS — 드림렌즈 처방 이력)
--   raw.raw_crm_lens_cfg        (LENS_CFG — 드림렌즈 종류명)
--
-- 방언 변환:
--   CUSTOM·NationCustom_CFG·RESERVATION·OPERATIONDATA → raw.raw_crm_<lower>
--   WITH(NOLOCK)·N'..' 제거 · ISNULL → COALESCE · RTRIM → TRIM
--   OUTER APPLY (SELECT TOP 1 ...) → LEFT JOIN LATERAL (... LIMIT 1) ON TRUE
--   OUTER APPLY (SELECT 집계) → LEFT JOIN LATERAL (SELECT 집계) ON TRUE  (vd=null 1행 유지)
--   문자열 + 결합 → ||
--   CONVERT(varchar(10), x, 120) — raw 쪽 date 컬럼이 varchar/timestamp 혼재 (§10.2):
--     reserve_date·operation_date = varchar → SUBSTRING 1~10
--     CUSTOM_HISTORY.reg_date 타입 확인 전까지는 보수적으로 SUBSTRING  (timestamp 로 적재되면
--     TO_CHAR(ch."registeredDate", 'YYYY-MM-DD') 로 변경 필요)
SELECT
    TRIM(c.cust_num)                                             AS "customerNo",
    COALESCE(n.nation_codename, '')                              AS "nationality",
    COALESCE(SUBSTRING(ch."registeredDate" FROM 1 FOR 10), '')   AS "registeredDate",
    COALESCE(rv."autoStatus", '')                                AS "status",
    COALESCE(SUBSTRING(exam."examDate"   FROM 1 FOR 10), '')     AS "examDate",
    COALESCE(SUBSTRING(op."operationDate" FROM 1 FOR 10), '')    AS "surgeryDate",
    COALESCE(op."operationRight", '')                            AS "operationRight",
    COALESCE(op."operationLeft", '')                             AS "operationLeft",
    COALESCE(lens."dreamlens", '')                               AS "dreamlens"
FROM raw.raw_crm_custom c
LEFT JOIN raw.raw_crm_nationcustom_cfg n ON c.nation_code = n.code
LEFT JOIN LATERAL (
    SELECT MIN(reg_date) AS "registeredDate"
    FROM raw.raw_crm_custom_history
    -- ⚠️ TRIM 양쪽: custom_history.cust_num(varchar 20) vs custom(13) 공백 패딩 길이 차이.
    -- docs/data-platform/varchar-padding-trim-audit.md §6.2 #8
    WHERE TRIM(cust_num) = TRIM(c.cust_num)
) ch ON TRUE
LEFT JOIN LATERAL (
    SELECT CASE reserve_flag
             WHEN 'O' THEN '수술완료'
             WHEN 'M' THEN '검사예약'
             WHEN 'F' THEN '외래문의'
             WHEN 'E' THEN '외래문의'
             WHEN 'H' THEN '검사예약'
             WHEN 'Z' THEN '검사예약'
           END AS "autoStatus"
    FROM raw.raw_crm_reservation
    WHERE cust_num = c.cust_num AND reserve_state <> 'C'
    ORDER BY CASE reserve_flag WHEN 'O' THEN 1 WHEN 'M' THEN 2 ELSE 3 END
    LIMIT 1
) rv ON TRUE
LEFT JOIN LATERAL (
    SELECT reserve_date AS "examDate"
    FROM raw.raw_crm_reservation
    WHERE cust_num = c.cust_num AND reserve_flag = 'M' AND reserve_state <> 'C'
    ORDER BY reserve_date DESC
    LIMIT 1
) exam ON TRUE
LEFT JOIN LATERAL (
    SELECT operation_date      AS "operationDate",
           TRIM(operationr)    AS "operationRight",
           TRIM(operationl)    AS "operationLeft"
    FROM raw.raw_crm_operationdata
    WHERE cust_num = c.cust_num
    ORDER BY operation_date DESC
    LIMIT 1
) op ON TRUE
LEFT JOIN LATERAL (
    SELECT CASE WHEN COALESCE(ln.lens_nm, '') <> '' AND COALESCE(lt.lens_nm, '') <> ''
                THEN lt.lens_nm || ' ' || ln.lens_nm
                ELSE COALESCE(lt.lens_nm, '')
           END AS "dreamlens"
    FROM raw.raw_crm_lens l
    LEFT JOIN raw.raw_crm_lens_cfg lt ON lt.lens_cd = l.lens_gubun
    LEFT JOIN raw.raw_crm_lens_cfg ln ON ln.lens_cd = l.lens_kind
    WHERE l.cust_num = c.cust_num AND l.seq = 1
    LIMIT 1
) lens ON TRUE
-- ⚠️ TRIM 좌변: custom.cust_num(13) 저장은 공백 패딩, Java 쪽 :customerNos 는 trimmed.
-- docs/data-platform/varchar-padding-trim-audit.md §6.2 #10
WHERE TRIM(c.cust_num) IN (:customerNos)
