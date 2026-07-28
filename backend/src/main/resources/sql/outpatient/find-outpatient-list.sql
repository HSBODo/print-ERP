            SELECT
              ISNULL(LTRIM(RTRIM(rv.RESERVE_NUM)), '')       AS reserveNum,
              ISNULL(rv.RESERVE_DATE, '')                    AS reserveDate,
              ISNULL(rv.START_TIME, '')                      AS reserveTime,
              ISNULL(rv.END_TIME, '')                        AS endTime,
              CASE rv.RESERVE_STATE
                WHEN 'I' THEN '내원'
                WHEN 'H' THEN '퇴원'
                ELSE ISNULL(rv.RESERVE_STATE, '')
              END                                            AS state,
              ISNULL(rv.RESERVE_STATE, '')                   AS stateCode,
              ISNULL(
                NULLIF(LTRIM(RTRIM(ms.SUB_NAME)), ''),
                ISNULL(rv.RESERVE_JINRYO, '')
              )                                              AS reserveType,
              ISNULL(rv.RESERVE_JINRYO, '')                  AS reserveJinryoCode,
              CASE WHEN ISNULL(cu.FIRST_DAY, '') >= :from AND ISNULL(cu.FIRST_DAY, '') <= :to
                   THEN '신환' ELSE '구환' END               AS patientType,
              ISNULL(rv.OLD_FLAG, '')                        AS oldFlag,
              ISNULL(rv.TODAY_FLAG, '')                      AS todayFlag,
              ISNULL(rv.HAPPYCALL_FLAG, '')                  AS happyCall,
              ISNULL(LTRIM(RTRIM(cu.CUST_NUM)), '')          AS chartNo,
              ISNULL(cu.CUST_NAME, '')                       AS name,
              ISNULL(cu.CUST_ENAME, '')                      AS nameEng,
              ISNULL(cu.LEVEL, '')                           AS grade,
              ISNULL(cu.BIRTH_DAY, '')                       AS birth,
              CASE WHEN cu.LUNAR_YN = 'Y' THEN '음' ELSE '양' END AS lunar,
              ISNULL(cu.CALL_NUM1, '')                       AS phone1,
              ISNULL(cu.CALL_NUM2, '')                       AS phone2,
              ISNULL(cu.EMAIL, '')                           AS email,
              ISNULL(LTRIM(RTRIM(cu.ZIP_CODE)), '')          AS zip,
              ISNULL(cu.ADDR1, '')                           AS addr1,
              ISNULL(cu.ADDR2, '')                           AS addr2,
              ISNULL(doc.EMP_NAME, '')                       AS doctor,
              ISNULL(cns.EMP_NAME, '')                       AS counselor,
              ISNULL(reg.EMP_NAME, '')                       AS registeredBy,
              ISNULL(rv.COMMENT, '')                         AS comment,
              ISNULL(rv.RESERVE_PATH, '')                    AS route,
              ISNULL(motive.section, '')                     AS section,
              ISNULL(motive.motiveL, '')                     AS motiveL,
              ISNULL(motive.motiveM, '')                     AS motiveM,
              ISNULL(motive.motiveS, '')                     AS motiveS,
              ISNULL(motive.motiveMemo, '')                  AS motiveMemo,
              ISNULL(cu.JOB, '')                             AS job,
              ISNULL(cu.LAST_DAY, '')                        AS lastVisit,
              ISNULL(ins.EtcCodNam, '')                      AS insurance,
              ISNULL(nation.Nation_CodeName, '')             AS nationality,
              ISNULL(cu.ETC, '')                             AS memo
            FROM RESERVATION rv WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK)                    ON rv.CUST_NUM = cu.CUST_NUM
            LEFT JOIN EMPLOYEE doc WITH(NOLOCK)
              ON doc.EMP_NUM = ISNULL(NULLIF(rv.SELECT_DOC, ''), rv.RESERVE_DOC)
             AND doc.EMP_STATE <> 'N'
            LEFT JOIN EMPLOYEE cns WITH(NOLOCK)
              ON cns.EMP_NUM = rv.RESERVE_EMP
             AND cns.EMP_STATE <> 'N'
            LEFT JOIN EMPLOYEE reg WITH(NOLOCK)
              ON reg.EMP_NUM = rv.REGISTER_EMP
             AND reg.EMP_STATE <> 'N'
            LEFT JOIN MEDICAL_SUB_CFG ms WITH(NOLOCK)
              ON ms.RESERVE_FLAG = rv.RESERVE_FLAG
             AND ms.SUB_FLAG = ISNULL(rv.RESERVE_JINRYO, '')
            LEFT JOIN NationCustom_CFG nation WITH(NOLOCK) ON cu.Nation_code = nation.Code
            LEFT JOIN EtcCfg ins WITH(NOLOCK)
              ON ins.EtcBseCod = 'InsuranceCfg'
             AND ins.EtcCod = cu.InsuranceCode
            OUTER APPLY (
              SELECT TOP 1
                ISNULL(m2.category01_name, '') AS motiveL,
                ISNULL(m2.category02_name, '') AS motiveM,
                ISNULL(m2.category03_name, '') AS motiveS,
                ISNULL(NULLIF(m1.comments, ''), ISNULL(m2.name, '')) AS motiveMemo,
                ISNULL(CONVERT(varchar(10), m2.[section]), '') AS section
              FROM MOTIVE_NEW02 m2 WITH(NOLOCK)
              LEFT JOIN MOTIVE_NEW01 m1 WITH(NOLOCK) ON m2.fkey = m1.pkey
              WHERE m2.cust_num = rv.CUST_NUM AND m2.Idx = '1'
              ORDER BY m2.pkey DESC
            ) motive
            WHERE rv.RESERVE_DATE >= :from AND rv.RESERVE_DATE <= :to
              AND rv.RESERVE_FLAG = 'F'
              AND rv.RESERVE_STATE IN ('I','H')
              AND NOT (
                ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
              )
            ORDER BY rv.RESERVE_DATE, rv.START_TIME, cu.CUST_NAME
