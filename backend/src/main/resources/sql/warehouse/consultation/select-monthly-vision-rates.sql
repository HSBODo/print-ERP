-- 월별 시력교정 상담전환율 (EXAM 기반) · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/softcrm/consultation/select-monthly-vision-rates.sql — 지표 정의는 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE wave 2 (2026-10-06).
-- ConsultationReconcileService 전용(파이프라인 밖). exam_date·reserve_date 는 varchar(YYYY-MM-DD).
            SELECT t.yr, t.mo,
                COUNT(*) AS "examCount",
                SUM(t.counsel) AS "counselCount",
                SUM(t.booked) AS "surgeryBookedCount",
                SUM(t.actual) AS "actualSurgeryCount",
                SUM(CASE WHEN t.od = 0 THEN 1 ELSE 0 END) AS "examGeneral",
                SUM(CASE WHEN t.od = 0 AND t.booked = 1 THEN 1 ELSE 0 END) AS "bookedGeneral",
                SUM(CASE WHEN t.od = 1 AND t.counsel = 1 THEN 1 ELSE 0 END) AS "counselOneday",
                SUM(CASE WHEN t.od = 1 AND t.counsel = 1 AND t.booked = 1 THEN 1 ELSE 0 END) AS "counselBookedOneday",
                SUM(CASE WHEN t.od = 0 AND t.counsel = 1 THEN 1 ELSE 0 END) AS "counselGeneral",
                SUM(CASE WHEN t.od = 0 AND t.counsel = 1 AND t.booked = 1 THEN 1 ELSE 0 END) AS "counselBookedGeneral"
            FROM (
                SELECT CAST(SUBSTRING(E.exam_date FROM 1 FOR 4) AS INT) AS yr,
                       CAST(SUBSTRING(E.exam_date FROM 6 FOR 2) AS INT) AS mo,
                    CASE WHEN COALESCE(E.stop_yn,'') <> 'Y'
                          AND (RTRIM(COALESCE(E.operationr,'')) <> '' OR RTRIM(COALESCE(E.operationl,'')) <> '')
                         THEN 1 ELSE 0 END AS counsel,
                    CASE WHEN rs.min_rsv_date IS NOT NULL THEN 1 ELSE 0 END AS booked,
                    CASE WHEN mo.min_op_date IS NOT NULL THEN 1 ELSE 0 END AS actual,
                    -- 원데이(od) 플래그 — 2026-09-09 확정: 재수술 당일OP(M/7) 도 포함.
                    CASE WHEN EXISTS (
                            SELECT 1 FROM raw.raw_crm_reservation r
                             WHERE r.cust_num = E.cust_num AND r.reserve_date = E.exam_date
                               AND r.reserve_flag = 'M' AND r.reserve_state IN ('I','H') AND r.reserve_jinryo IN ('5','7')
                         ) THEN 1 ELSE 0 END AS od
                FROM raw.raw_crm_exam E
                LEFT JOIN (
                    SELECT cust_num, MIN(reserve_date) AS min_rsv_date
                      FROM raw.raw_crm_reservation
                     WHERE reserve_flag = 'O' AND reserve_state <> 'C'
                     GROUP BY cust_num
                ) rs ON rs.cust_num = E.cust_num
                LEFT JOIN (
                    SELECT cust_num, MIN(operation_date) AS min_op_date
                      FROM raw.raw_crm_operationdata
                     GROUP BY cust_num
                ) mo ON mo.cust_num = E.cust_num
                WHERE E.exam_date >= :from AND E.exam_date <= :to
                    AND COALESCE(E.cancel_cd,'') = ''
            ) t
            GROUP BY t.yr, t.mo
            ORDER BY t.yr, t.mo
