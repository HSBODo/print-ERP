-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/surgery/select-reoperation-candidates.sql
-- 이관 이력: 2026-09-29 A4-1 (SurgeryMartJob 배치 read-side · list_reoperation).
--
-- 방언 변환 요약:
--   RE_OPERATION → raw.raw_crm_re_operation
--   CUSTOM → raw.raw_crm_custom
--   EMPLOYEE → raw.raw_crm_employee
--   COSTPRICE → raw.raw_crm_costprice
--   ISNULL(x, y) → COALESCE(x, y)
--   TOP 1 → LIMIT 1
--   N'문자열' → '문자열' (Postgres UTF-8 기본)
--   WITH(NOLOCK) → 제거
--   MSSQL 통화 포맷:
--     REPLACE(CONVERT(varchar(30), CONVERT(money, x), 1), '.00', '')
--     → REPLACE(TO_CHAR(x, 'FM999,999,999,990.00'), '.00', '')
--
-- ⚠️ alias double-quote 필수 — Writer 가 r.get("reopDate") case-sensitive 접근.
--
-- ⚠️ 컬럼 확인 완료 (raw-columns.txt):
--   re_operation.reop_date/cust_num/again_doctor/again_r/again_l/reason_cd (모두 varchar)
--   costprice.cost_price(numeric)/cost_date(varchar)/paystt(varchar)/cust_num(varchar)
--   employee.emp_num/emp_name/emp_state
--   custom.cust_num/cust_name/cust_ename/first_day (모두 varchar)
WITH base AS (
    SELECT
        LTRIM(RTRIM(r.cust_num)) AS "chartNo",
        COALESCE(cu.cust_name, '') AS "name",
        COALESCE(cu.cust_ename, '') AS "nameEng",
        CASE WHEN COALESCE(cu.first_day, '') >= :from AND COALESCE(cu.first_day, '') <= :to
             THEN '신환' ELSE '구환' END AS "patientType",
        COALESCE((
            SELECT e.emp_name
            FROM raw.raw_crm_employee e
            WHERE e.emp_num = r.again_doctor
            LIMIT 1
        ), '') AS "surgeon",
        -- 재수술일 기준 수납금액(COSTPRICE, PayStt<>'A'). 0/무료는 '' → 표에서 '—'.
        COALESCE(
            REPLACE(
                TO_CHAR(
                    NULLIF((
                        SELECT SUM(COALESCE(cp.cost_price, 0))
                        FROM raw.raw_crm_costprice cp
                        WHERE cp.cust_num = r.cust_num
                          AND cp.cost_date = r.reop_date
                          AND UPPER(COALESCE(cp.paystt, '')) <> 'A'
                    ), 0),
                    'FM999,999,999,990.00'
                ),
                '.00', ''
            ),
            ''
        ) AS "payment",
        COALESCE(r.reop_date, '') AS "reopDate",
        COALESCE(r.again_r, '') AS "againR",
        COALESCE(r.again_l, '') AS "againL",
        RTRIM(COALESCE(r.reason_cd, '')) AS "reasonCd",
        -- 재수술 판정(행 단위) — find-reoperation-monthly.sql 과 동일한 규칙.
        --   01 Irrigation(세척) · 07 Lens Reposition(재위치) · 10 CATARACT(백내장) 은 재수술 아님
        --   시술명이 Irrigation 이면 사유코드 오입력(02 ENHANCE)이라 함께 제외
        CASE WHEN (
            RTRIM(COALESCE(r.reason_cd, '')) NOT IN ('01', '07', '10')
            AND COALESCE(r.again_r, '') NOT LIKE 'Irrigation%'
            AND COALESCE(r.again_l, '') NOT LIKE 'Irrigation%'
            AND (RTRIM(COALESCE(r.again_r, '')) <> '' OR RTRIM(COALESCE(r.again_l, '')) <> '')
        ) THEN 1 ELSE 0 END AS "autoIncluded"
    FROM raw.raw_crm_re_operation r
    LEFT JOIN raw.raw_crm_custom cu ON cu.cust_num = r.cust_num
    WHERE r.reop_date >= :from AND r.reop_date <= :to
      AND COALESCE(cu.cust_name, '') NOT LIKE '%테스트%'
      AND LOWER(COALESCE(cu.cust_name, '')) NOT LIKE '%test%'
)
SELECT
    "chartNo",
    "name",
    "nameEng",
    "patientType",
    "surgeon",
    "payment",
    "reopDate",
    "againR",
    "againL",
    "autoIncluded",
    -- 제외 사유 — 추측이 아니라 RE_OPERATION.REASON_CD/REOP_REASON 실제 값으로 표기.
    -- 프론트(ReoperationCandidatesModal)가 이 문자열로 그룹핑하므로 값 종류를 고정한다.
    CASE
        WHEN "autoIncluded" = 1 THEN ''
        WHEN "reasonCd" = '01' THEN '세척(Irrigation)'
        WHEN "reasonCd" = '07' THEN '재위치(Lens Reposition)'
        WHEN "reasonCd" = '10' THEN '백내장(CATARACT)'
        WHEN ("againR" LIKE 'Irrigation%' OR "againL" LIKE 'Irrigation%')
            THEN '세척(Irrigation) · 사유코드 오입력'
        WHEN RTRIM("againR") = '' AND RTRIM("againL") = '' THEN '시술명 없음'
        ELSE '기타'
    END AS "excludeReason"
FROM base
ORDER BY "autoIncluded" DESC, "excludeReason", "reopDate", "chartNo"
