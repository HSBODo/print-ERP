            WITH cataract_ops AS (
              SELECT
                x.CUST_NUM,
                x.OPERATION_DATE,
                MAX(x.OPERATIONR) AS OPERATIONR,
                MAX(x.OPERATIONL) AS OPERATIONL,
                MAX(x.OPERATION_DOC) AS OPERATION_DOC
              FROM (
                SELECT
                  c.CUST_NUM,
                  c.OPERATIONR_DATE AS OPERATION_DATE,
                  ISNULL(c.OPERATIONR, '') AS OPERATIONR,
                  '' AS OPERATIONL,
                  ISNULL(c.OPERATIONR_DOC, '') AS OPERATION_DOC
                FROM Cataract_Operationdata c WITH(NOLOCK)
                WHERE ISNULL(c.OPERATIONR_DATE, '') <> ''
                  AND ISNULL(c.OPERATIONR, '') <> ''
                  AND ISNULL(c.OPERATIONR, '') NOT IN ('X','OP불가','TEST-TEST')

                UNION ALL

                SELECT
                  c.CUST_NUM,
                  c.OPERATIONL_DATE AS OPERATION_DATE,
                  '' AS OPERATIONR,
                  ISNULL(c.OPERATIONL, '') AS OPERATIONL,
                  ISNULL(c.OPERATIONL_DOC, '') AS OPERATION_DOC
                FROM Cataract_Operationdata c WITH(NOLOCK)
                WHERE ISNULL(c.OPERATIONL_DATE, '') <> ''
                  AND ISNULL(c.OPERATIONL, '') <> ''
                  AND ISNULL(c.OPERATIONL, '') NOT IN ('X','OP불가','TEST-TEST')
              ) x
              GROUP BY x.CUST_NUM, x.OPERATION_DATE
            ),
            rows AS (
              SELECT
                '시력교정' AS surgeryCategory,
                op.CUST_NUM,
                op.OPERATION_DATE AS surgeryDate,
                ISNULL(op.OPERATIONR, '') AS surgeryR,
                ISNULL(op.OPERATIONL, '') AS surgeryL,
                ISNULL(op.OPERATION_DOC, '') AS surgeonCode,
                ISNULL(ex.EXAM_DATE, '') AS examDate,
                ISNULL(ex.OPERATIONR, '') AS recommendedR,
                ISNULL(ex.OPERATIONL, '') AS recommendedL,
                ISNULL(ex.OP_ESTIMATE, '') AS estimate,
                ISNULL(ex.ExamPercent, '') AS surgeryRate,
                ISNULL(ex.EXAM_MEMO, '') AS examMemo
              FROM OPERATIONDATA op WITH(NOLOCK)
              OUTER APPLY (
                SELECT TOP 1 e.*
                FROM EXAM e WITH(NOLOCK)
                WHERE e.CUST_NUM = op.CUST_NUM
                ORDER BY
                  CASE WHEN e.EXAM_DATE <= op.OPERATION_DATE THEN 0 ELSE 1 END,
                  e.EXAM_DATE DESC
              ) ex
              WHERE op.OPERATION_DATE >= :from AND op.OPERATION_DATE <= :to
                AND NOT EXISTS (
                  SELECT 1
                  FROM Cataract_Operationdata cod WITH(NOLOCK)
                  WHERE cod.CUST_NUM = op.CUST_NUM
                )
                AND (
                  (ISNULL(op.OPERATIONR, '') <> '' AND op.OPERATIONR NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST'))
                  OR
                  (ISNULL(op.OPERATIONL, '') <> '' AND op.OPERATIONL NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST'))
                )

              UNION ALL

              SELECT
                '백내장' AS surgeryCategory,
                co.CUST_NUM,
                co.OPERATION_DATE AS surgeryDate,
                ISNULL(co.OPERATIONR, '') AS surgeryR,
                ISNULL(co.OPERATIONL, '') AS surgeryL,
                ISNULL(co.OPERATION_DOC, '') AS surgeonCode,
                ISNULL(ce.EXAM_DATE, '') AS examDate,
                ISNULL(ce.OPERATIONR, '') AS recommendedR,
                ISNULL(ce.OPERATIONL, '') AS recommendedL,
                ISNULL(ISNULL(ce.OP_ESTIMATE_R, '') + CASE WHEN ISNULL(ce.OP_ESTIMATE_L, '') <> '' THEN '/' + ce.OP_ESTIMATE_L ELSE '' END, '') AS estimate,
                '' AS surgeryRate,
                ISNULL(ce.EXAM_MEMO, '') AS examMemo
              FROM cataract_ops co
              OUTER APPLY (
                SELECT TOP 1 ce.*
                FROM Cataract_Exam ce WITH(NOLOCK)
                WHERE ce.CUST_NUM = co.CUST_NUM
                ORDER BY
                  CASE WHEN ce.EXAM_DATE <= co.OPERATION_DATE THEN 0 ELSE 1 END,
                  ce.EXAM_DATE DESC,
                  ce.SEQ DESC
              ) ce
              WHERE co.OPERATION_DATE >= :from AND co.OPERATION_DATE <= :to
            )
            SELECT
              ISNULL(LTRIM(RTRIM(cu.CUST_NUM)), '') AS chartNo,
              ISNULL(cu.CUST_NAME, '') AS name,
              ISNULL(cu.CUST_ENAME, '') AS nameEng,
              rows.surgeryCategory,
              ISNULL(rows.surgeryDate, '') AS surgeryDate,
              ISNULL(rows.examDate, '') AS examDate,
              CASE WHEN ISNULL(cu.FIRST_DAY, '') >= :from AND ISNULL(cu.FIRST_DAY, '') <= :to
                   THEN '신환' ELSE '구환' END AS patientType,
              ISNULL(rsv.RESERVE_DATE, '') AS surgeryReserveDate,
              ISNULL(rsvReg.regDate, '') AS surgeryRegDate,
              ISNULL(rsv.START_TIME, '') AS surgeryTime,
              ISNULL(rows.surgeryR, '') AS surgeryR,
              ISNULL(rows.surgeryL, '') AS surgeryL,
              ISNULL(rows.recommendedR, '') AS recommendedR,
              ISNULL(rows.recommendedL, '') AS recommendedL,
              ISNULL(rows.estimate, '') AS estimate,
              ISNULL(rows.surgeryRate, '') AS surgeryRate,
              ISNULL(REPLACE(CONVERT(varchar(30), CONVERT(money, NULLIF(pay.RECEIPT, 0)), 1), '.00', ''), '') AS payment,
              ISNULL(os.EMP_NAME, '') AS surgeon,
              ISNULL(ec.EMP_NAME, '') AS counselor,
              ISNULL(ed.EMP_NAME, '') AS doctor,
              ISNULL(eo.EMP_NAME, '') AS optometrist,
              ISNULL(cu.BIRTH_DAY, '') AS birth,
              CASE WHEN cu.LUNAR_YN = 'Y' THEN '음' ELSE '양' END AS lunar,
              ISNULL(cu.CALL_NUM1, '') AS phone1,
              ISNULL(cu.CALL_NUM2, '') AS phone2,
              ISNULL(cu.EMAIL, '') AS email,
              ISNULL(LTRIM(RTRIM(cu.ZIP_CODE)), '') AS zip,
              ISNULL(cu.ADDR1, '') AS addr1,
              ISNULL(cu.ADDR2, '') AS addr2,
              ISNULL(cu.ETC, '') AS memo,
              ISNULL(cu.LEVEL, '') AS grade,
              ISNULL(cu.JOB, '') AS job,
              ISNULL(cu.LAST_DAY, '') AS lastVisit,
              ISNULL(rsv.RESERVE_PATH, '') AS route,
              ISNULL(motive.section, '') AS section,
              ISNULL(motive.motiveL, '') AS motiveL,
              ISNULL(motive.motiveM, '') AS motiveM,
              ISNULL(motive.motiveS, '') AS motiveS,
              ISNULL(motive.motiveMemo, '') AS motiveMemo,
              ISNULL(rows.examMemo, '') AS examMemo,
              ISNULL(ins.EtcCodNam, '') AS insurance,
              ISNULL(nation.Nation_CodeName, '') AS nationality
            FROM rows
            JOIN CUSTOM cu WITH(NOLOCK) ON rows.CUST_NUM = cu.CUST_NUM
            LEFT JOIN EMPLOYEE ec WITH(NOLOCK) ON cu.MY_COUNSELOR = ec.EMP_NUM
            LEFT JOIN EMPLOYEE ed WITH(NOLOCK) ON cu.MY_DOCTOR = ed.EMP_NUM
            LEFT JOIN EMPLOYEE eo WITH(NOLOCK) ON cu.MY_OPTOMETRIST = eo.EMP_NUM
            LEFT JOIN EMPLOYEE os WITH(NOLOCK) ON rows.surgeonCode = os.EMP_NUM
            LEFT JOIN NationCustom_CFG nation WITH(NOLOCK) ON cu.Nation_code = nation.Code
            LEFT JOIN EtcCfg ins WITH(NOLOCK)
              ON ins.EtcBseCod = 'InsuranceCfg'
             AND ins.EtcCod = cu.InsuranceCode
            OUTER APPLY (
              SELECT TOP 1 r.*
              FROM RESERVATION r WITH(NOLOCK)
              WHERE r.CUST_NUM = rows.CUST_NUM
                AND r.RESERVE_FLAG = 'O'
                AND r.RESERVE_STATE <> 'C'
              ORDER BY
                CASE WHEN r.RESERVE_DATE = rows.surgeryDate THEN 0 ELSE 1 END,
                r.RESERVE_DATE DESC,
                r.RESERVE_NUM DESC
            ) rsv
            OUTER APPLY (
              SELECT CASE WHEN LEN(LTRIM(RTRIM(ISNULL(rsv.RESERVE_NUM, '')))) >= 6
                          THEN '20' + SUBSTRING(LTRIM(RTRIM(rsv.RESERVE_NUM)), 1, 2)
                             + '-' + SUBSTRING(LTRIM(RTRIM(rsv.RESERVE_NUM)), 3, 2)
                             + '-' + SUBSTRING(LTRIM(RTRIM(rsv.RESERVE_NUM)), 5, 2)
                          ELSE '' END AS regDate
            ) rsvReg
            OUTER APPLY (
              SELECT TOP 1
                ISNULL(m2.category01_name, '') AS motiveL,
                ISNULL(m2.category02_name, '') AS motiveM,
                ISNULL(m2.category03_name, '') AS motiveS,
                ISNULL(NULLIF(m1.comments, ''), ISNULL(m2.name, '')) AS motiveMemo,
                ISNULL(CONVERT(varchar(10), m2.[section]), '') AS section
              FROM MOTIVE_NEW02 m2 WITH(NOLOCK)
              LEFT JOIN MOTIVE_NEW01 m1 WITH(NOLOCK) ON m2.fkey = m1.pkey
              WHERE m2.cust_num = rows.CUST_NUM AND m2.Idx = '1'
              ORDER BY m2.pkey DESC
            ) motive
            OUTER APPLY (
              SELECT SUM(ISNULL(cp.COST_PRICE, 0)) AS RECEIPT
              FROM COSTPRICE cp WITH(NOLOCK)
              WHERE cp.CUST_NUM = rows.CUST_NUM
                AND cp.COST_DATE = rows.surgeryDate
                AND UPPER(ISNULL(cp.PayStt, '')) <> 'A'
            ) pay
            WHERE NOT (
              ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
              OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
            )
            ORDER BY rows.surgeryDate, rsv.START_TIME, cu.CUST_NAME, rows.surgeryCategory
