            SELECT
              ISNULL(LTRIM(RTRIM(cu.CUST_NUM)), '')        AS chartNo,
              ISNULL(cu.CUST_NAME, '')                     AS name,
              ISNULL(cu.CUST_ENAME, '')                    AS nameEng,
              ISNULL(e.EXAM_DATE, '')                      AS examDate,
              ISNULL(
                NULLIF(LTRIM(RTRIM(ms.SUB_NAME)), ''),
                CASE
                  WHEN ISNULL(rsv.RESERVE_JINRYO,'')='1' THEN '검사'
                  WHEN ISNULL(rsv.RESERVE_JINRYO,'')='5' THEN '검사OP'
                  WHEN ISNULL(rsv.RESERVE_JINRYO,'')='4' THEN 'DNA검사'
                  WHEN ISNULL(rsv.RESERVE_JINRYO,'')='2' THEN '재검사'
                  WHEN ISNULL(rsv.RESERVE_JINRYO,'')='6' THEN '당일재검사'
                  WHEN ISNULL(rsv.RESERVE_JINRYO,'')='7' THEN '검사OP(Re)'
                  ELSE ISNULL(rsv.RESERVE_JINRYO, '')
                END
              )                                             AS examType,
              CASE WHEN visit.hasDreamlens = 1 AND visit.hasMedical = 0 THEN '드림렌즈' ELSE '시력교정' END AS examCategory,
              -- 원데이 검사: 같은날 검사OP(M/5) 또는 검사OP(Re)(M/7) 예약 내원 (테스트메모만 제외).
              -- 2026-07-30 확정: "수술 중단이 아닐 것"(STOP_YN·CANCEL_CD) 단서 제거 — 수술 가능 여부는
              -- 검사 결과이지 검사 종류가 아니다 (docs/점검/원데이-레거시-비교_2026-07.md §5).
              -- 2026-09-09 확정: 재수술 당일OP(M/7) 도 원데이로 포함 — 레거시 정의와 정렬
              -- (docs/exam/oneday-legacy-align.md §3). 2026-07-29 결정("일반") 을 뒤집음.
              -- all-exam-list examType('원데이'/'일반') 파생용. 드림렌즈·백내장은 마트 조회 시 ''로 무효화.
              CASE WHEN NOT (ISNULL(e.EXAM_MEMO, '') LIKE N'%테스트%' OR LOWER(ISNULL(e.EXAM_MEMO, '')) LIKE '%test%')
                    AND EXISTS (SELECT 1 FROM RESERVATION r5 WITH(NOLOCK)
                                WHERE r5.CUST_NUM = e.CUST_NUM AND r5.RESERVE_DATE = e.EXAM_DATE
                                  AND r5.RESERVE_FLAG = 'M' AND r5.RESERVE_JINRYO IN ('5','7') AND r5.RESERVE_STATE IN ('I','H'))
                   THEN 'Y' ELSE 'N' END                     AS oneDay,
              CASE WHEN ISNULL(cu.FIRST_DAY, '') >= :from AND ISNULL(cu.FIRST_DAY, '') <= :to
                   THEN '신환' ELSE '구환' END             AS patientType,
              ISNULL(rsvReg.regDate, '')                   AS examRegDate,
              ISNULL(e.EXAM_MEMO, '')                      AS examMemo,
              ISNULL(e.OP_ESTIMATE, '')                    AS estimate,
              ISNULL(e.ExamPercent, '')                    AS surgeryRate,
              ISNULL(rsv.START_TIME, '')                   AS examTime,
              ISNULL(e.OPERATIONR, '')                     AS recommendedR,
              ISNULL(e.OPERATIONL, '')                     AS recommendedL,
              ISNULL(opReg.regDate, '')                    AS surgeryRegDate,
              ISNULL(opRsv.RESERVE_DATE, '')               AS surgeryReserveDate,
              ISNULL(op.OPERATION_DATE, '')                AS surgeryDate,
              ISNULL(op.OPERATIONR, '')                    AS surgeryR,
              ISNULL(op.OPERATIONL, '')                    AS surgeryL,
              ISNULL(os.EMP_NAME, '')                      AS surgeon,
              ISNULL(REPLACE(CONVERT(varchar(30), CONVERT(money, NULLIF(pay.RECEIPT, 0)), 1), '.00', ''), '') AS payment,
              ISNULL(ec.EMP_NAME, '')                      AS counselor,
              ISNULL(ed.EMP_NAME, '')                      AS doctor,
              ''                                           AS jumin,              -- PII: 복호화/마스킹 필요
              ISNULL(cu.BIRTH_DAY, '')                     AS birth,
              CASE WHEN cu.LUNAR_YN = 'Y' THEN '음' ELSE '양' END AS lunar,
              ISNULL(cu.CALL_NUM1, '')                     AS phone1,
              ISNULL(cu.CALL_NUM2, '')                     AS phone2,
              ISNULL(cu.EMAIL, '')                         AS email,
              ISNULL(LTRIM(RTRIM(cu.ZIP_CODE)), '')        AS zip,
              ISNULL(cu.ADDR1, '')                         AS addr1,
              ISNULL(cu.ADDR2, '')                         AS addr2,
              ISNULL(cu.ETC, '')                           AS memo,
              ISNULL(e.STOP_YN, '')                        AS examStop,
              ISNULL(e.OP_POSSIBLE_YN, '')                 AS opImpossible,
              ISNULL(rsv.RESERVE_PATH, '')                 AS route,
              ISNULL(motive.section, '')                   AS section,
              ISNULL(motive.motiveL, '')                   AS motiveL,
              ISNULL(motive.motiveM, '')                   AS motiveM,
              ISNULL(motive.motiveS, '')                   AS motiveS,
              ISNULL(motive.motiveMemo, '')                AS motiveMemo,
              ISNULL(eo.EMP_NAME, '')                      AS optometrist,
              ISNULL(LTRIM(RTRIM(e.CANCEL_CD)), '')        AS cancelCode,
              ISNULL(NULLIF(e.CANCEL_REASON, ''), ISNULL(cc.CANCEL_REASON, '')) AS cancelMemo,
              ISNULL(cu.LEVEL, '')                         AS grade,
              ISNULL(cu.JOB, '')                           AS job,
              ISNULL(cu.LAST_DAY, '')                      AS lastVisit,
              ISNULL(ins.EtcCodNam, '')                    AS insurance,
              ISNULL(nation.Nation_CodeName, '')           AS nationality
            FROM EXAM e WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK)              ON e.CUST_NUM = cu.CUST_NUM
            LEFT JOIN OPERATIONDATA op WITH(NOLOCK)  ON e.CUST_NUM = op.CUST_NUM
            LEFT JOIN EMPLOYEE ec WITH(NOLOCK)       ON cu.MY_COUNSELOR   = ec.EMP_NUM
            LEFT JOIN EMPLOYEE ed WITH(NOLOCK)       ON cu.MY_DOCTOR      = ed.EMP_NUM
            LEFT JOIN EMPLOYEE eo WITH(NOLOCK)       ON cu.MY_OPTOMETRIST = eo.EMP_NUM
            LEFT JOIN EMPLOYEE os WITH(NOLOCK)       ON op.OPERATION_DOC  = os.EMP_NUM
            LEFT JOIN CANCEL_CFG cc WITH(NOLOCK)     ON e.CANCEL_CD       = cc.CANCEL_CD
            LEFT JOIN NationCustom_CFG nation WITH(NOLOCK) ON cu.Nation_code = nation.Code
            LEFT JOIN EtcCfg ins WITH(NOLOCK)
              ON ins.EtcBseCod = 'InsuranceCfg'
             AND ins.EtcCod = cu.InsuranceCode
            OUTER APPLY (
              SELECT
                CASE WHEN EXISTS (
                  SELECT 1 FROM RESERVATION rd WITH(NOLOCK)
                  WHERE rd.CUST_NUM = e.CUST_NUM
                    AND rd.RESERVE_DATE = e.EXAM_DATE
                    AND rd.RESERVE_STATE IN ('I','H')
                    AND rd.RESERVE_FLAG = 'D'
                ) THEN 1 ELSE 0 END AS hasDreamlens,
                CASE WHEN EXISTS (
                  SELECT 1 FROM RESERVATION rm WITH(NOLOCK)
                  WHERE rm.CUST_NUM = e.CUST_NUM
                    AND rm.RESERVE_DATE = e.EXAM_DATE
                    AND rm.RESERVE_STATE IN ('I','H')
                    AND rm.RESERVE_FLAG = 'M'
                ) THEN 1 ELSE 0 END AS hasMedical,
                -- 수술 연계: 검사일 이후(당일 포함) 수술예약(O, 취소 제외) 또는 수술기록 존재.
                -- 재수술(그날 O 예약)·수술 확정 환자를 시력교정 검사자로 유지하기 위한 판정.
                CASE WHEN EXISTS (
                  SELECT 1 FROM RESERVATION ro WITH(NOLOCK)
                  WHERE ro.CUST_NUM = e.CUST_NUM
                    AND ro.RESERVE_FLAG = 'O'
                    AND ro.RESERVE_STATE <> 'C'
                    AND ro.RESERVE_DATE >= e.EXAM_DATE
                ) OR EXISTS (
                  SELECT 1 FROM OPERATIONDATA od WITH(NOLOCK)
                  WHERE od.CUST_NUM = e.CUST_NUM
                    AND ISNULL(od.OPERATION_DATE, '') <> ''
                    AND od.OPERATION_DATE >= e.EXAM_DATE
                ) THEN 1 ELSE 0 END AS hasSurgeryLink
            ) visit
            OUTER APPLY (
              SELECT TOP 1 r.*
              FROM RESERVATION r WITH(NOLOCK)
              WHERE r.CUST_NUM = e.CUST_NUM
                AND r.RESERVE_DATE = e.EXAM_DATE
                AND r.RESERVE_STATE IN ('I','H')
                AND r.RESERVE_FLAG = 'M'
              ORDER BY r.RESERVE_NUM DESC
            ) rsv
            LEFT JOIN MEDICAL_SUB_CFG ms WITH(NOLOCK)
              ON ms.RESERVE_FLAG = rsv.RESERVE_FLAG
             AND ms.SUB_FLAG = ISNULL(rsv.RESERVE_JINRYO, '')
            OUTER APPLY (
              SELECT CASE WHEN LEN(LTRIM(RTRIM(ISNULL(rsv.RESERVE_NUM, '')))) >= 6
                          THEN '20' + SUBSTRING(LTRIM(RTRIM(rsv.RESERVE_NUM)), 1, 2)
                             + '-' + SUBSTRING(LTRIM(RTRIM(rsv.RESERVE_NUM)), 3, 2)
                             + '-' + SUBSTRING(LTRIM(RTRIM(rsv.RESERVE_NUM)), 5, 2)
                          ELSE '' END AS regDate
            ) rsvReg
            OUTER APPLY (
              -- "이 검사 이후" 수술 예약만 매칭 — 환자 전체 이력 중 "최근 생성" 1건을 뽑으면
              -- 과거 완료된 수술 예약(예: 수년 전 레이저 수술)이 검사일보다 이전 날짜로 뜨는
              -- 함정이 생긴다. 백내장은 양안 분산·장기 재방문 패턴에서 2026-01~10 중
              -- 49건(11.6%) 발생. 시력교정은 측정 결과 0건이지만 일관성 위해 동일 조건 적용.
              SELECT TOP 1 f.*
              FROM RESERVATION f WITH(NOLOCK)
              WHERE f.CUST_NUM = e.CUST_NUM AND f.RESERVE_FLAG = 'O' AND f.RESERVE_STATE <> 'C'
                AND f.RESERVE_DATE >= e.EXAM_DATE
              ORDER BY f.RESERVE_NUM DESC
            ) opRsv
            OUTER APPLY (
              SELECT CASE WHEN LEN(LTRIM(RTRIM(ISNULL(opRsv.RESERVE_NUM, '')))) >= 6
                          THEN '20' + SUBSTRING(LTRIM(RTRIM(opRsv.RESERVE_NUM)), 1, 2)
                             + '-' + SUBSTRING(LTRIM(RTRIM(opRsv.RESERVE_NUM)), 3, 2)
                             + '-' + SUBSTRING(LTRIM(RTRIM(opRsv.RESERVE_NUM)), 5, 2)
                          ELSE '' END AS regDate
            ) opReg
            OUTER APPLY (
              SELECT TOP 1
                ISNULL(m2.category01_name, '') AS motiveL,
                ISNULL(m2.category02_name, '') AS motiveM,
                ISNULL(m2.category03_name, '') AS motiveS,
                ISNULL(NULLIF(m1.comments, ''), ISNULL(m2.name, '')) AS motiveMemo,
                ISNULL(CONVERT(varchar(10), m2.[section]), '') AS section
              FROM MOTIVE_NEW02 m2 WITH(NOLOCK)
              LEFT JOIN MOTIVE_NEW01 m1 WITH(NOLOCK) ON m2.fkey = m1.pkey
              WHERE m2.cust_num = e.CUST_NUM AND m2.Idx = '1'
              ORDER BY m2.pkey DESC
            ) motive
            LEFT JOIN (
              SELECT TMP.PRC_CUSNUM, SUM(TMP.RECEIPT) AS RECEIPT
              FROM (
                SELECT A.CUST_NUM AS PRC_CUSNUM,
                       SUM(ISNULL(A.COST_PRICE, 0)) AS RECEIPT
                FROM COSTPRICE A WITH(NOLOCK)
                LEFT JOIN (
                  SELECT CstCusNum, CstSeq
                  FROM CSTPRCSUB WITH(NOLOCK)
                  GROUP BY CstCusNum, CstSeq
                ) B ON A.CUST_NUM = B.CstCusNum AND A.SEQ = B.CstSeq
                LEFT JOIN (
                  SELECT PrcCusNum, PrcSeq
                  FROM PRCITMLST WITH(NOLOCK)
                  GROUP BY PrcCusNum, PrcSeq
                ) C ON A.CUST_NUM = C.PrcCusNum AND A.SEQ = C.PrcSeq
                WHERE B.CstCusNum IS NULL
                  AND C.PrcCusNum IS NULL
                  AND A.COST_FLAG IN ('O','I','H')
                  AND UPPER(ISNULL(A.PayStt, '')) <> 'A'
                GROUP BY A.CUST_NUM

                UNION ALL

                SELECT B.CstCusNum AS PRC_CUSNUM,
                       SUM(ISNULL(B.CstPrc, 0)) AS RECEIPT
                FROM COSTPRICE A WITH(NOLOCK)
                JOIN CSTPRCSUB B WITH(NOLOCK)
                  ON A.CUST_NUM = B.CstCusNum
                 AND A.SEQ = B.CstSeq
                 AND A.COST_FLAG IN ('O','I','H')
                 AND B.CstCnlYnN = 'N'
                 AND B.CstPayTyp = 'N'
                LEFT JOIN PRCITMLST C WITH(NOLOCK)
                  ON B.CstCusNum = C.PrcCusNum
                 AND B.CstSeq = C.PrcSeq
                WHERE C.PrcCusNum IS NULL
                  AND UPPER(ISNULL(A.PayStt, '')) <> 'A'
                GROUP BY B.CstCusNum

                UNION ALL

                SELECT T2.CUST_NUM AS PRC_CUSNUM,
                       SUM(CASE D.PrcCnlYnN WHEN 'Y' THEN 0 ELSE ISNULL(D.PrcDtlPrc, 0) END) AS RECEIPT
                FROM (
                  SELECT DISTINCT A.CUST_NUM, A.SEQ
                  FROM COSTPRICE A WITH(NOLOCK)
                  WHERE ISNULL(A.COST_FLAG, '') = ''
                    AND UPPER(ISNULL(A.PayStt, '')) <> 'A'
                ) T2
                JOIN PRCITMLST C WITH(NOLOCK)
                  ON T2.CUST_NUM = C.PrcCusNum
                 AND T2.SEQ = C.PrcSeq
                 AND C.PrcCod IN ('O','I','H')
                JOIN PrcItmDtl D WITH(NOLOCK)
                  ON T2.CUST_NUM = D.PrcCusNum
                 AND T2.SEQ = D.PrcSeq
                 AND D.PrcCod IN ('O','I','H')
                GROUP BY T2.CUST_NUM
              ) TMP
              GROUP BY TMP.PRC_CUSNUM
            ) pay ON e.CUST_NUM = pay.PRC_CUSNUM
                 AND e.CUST_NUM <> '9999999999999'
            WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
              AND NOT (
                ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
              )
              AND NOT (
                EXISTS (
                  SELECT 1
                  FROM Cataract_Exam ce WITH(NOLOCK)
                  WHERE ce.CUST_NUM = e.CUST_NUM
                    AND ce.EXAM_DATE = e.EXAM_DATE
                )
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT01, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT01, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT02, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT02, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT03, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT03, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT04, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT04, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT05, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT05, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT06, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT06, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT07, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT07, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT08, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT08, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT09, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT09, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT10, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT10, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT11, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT11, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT12, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT12, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT13, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT13, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT14, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT14, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT15, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT15, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT16, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT16, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT17, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT17, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT18, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT18, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT19, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT19, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT20, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT20, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT21, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT21, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT22, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT22, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT23, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT23, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT24, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT24, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT25, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT25, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT26, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT26, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT27, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT27, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT28, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT28, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT29, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT29, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.RIGHT30, ''))), '') IS NULL
                AND NULLIF(LTRIM(RTRIM(ISNULL(e.LEFT30, ''))), '') IS NULL
              )
              -- 순수 외래 유입 제외(2026-07-30 확정, docs/점검/시력교정-검사자_2026-06~07.md):
              -- 그날 검사(M)·드림렌즈(D) 내원이 없고 수술 연계도 없으면 검사자가 아니다
              -- (외래·백내장 예약으로 와서 EXAM 행만 생긴 건). 재수술·수술확정 환자는 유지.
              AND NOT (visit.hasMedical = 0 AND visit.hasDreamlens = 0 AND visit.hasSurgeryLink = 0)
              -- 백내장 갈래와 중복 제거(2026-08-05, sql/softcrm/fragments/fragment-exam-session-source.sql 과 동일 조건 — 함께 고칠 것):
              -- 백내장 예약(H)으로만 내원한 날의 EXAM 행은 백내장 리스트가 이미 센다.
              -- 위 '순수 외래' 필터는 수술 연계가 있으면 통과시켜서 같은 사람이 두 번 세어졌다
              -- (2026-01~05 실측 4건). 그날 시력교정(M)·드림렌즈(D) 내원이 있으면 별개 세션이라 유지.
              -- EXISTS 조건은 select-cataract-exam-list.sql 의 모집단과 일치해야 한다.
              AND NOT (
                visit.hasMedical = 0 AND visit.hasDreamlens = 0
                AND EXISTS (
                  SELECT 1 FROM RESERVATION rh WITH(NOLOCK)
                  WHERE rh.CUST_NUM = e.CUST_NUM AND rh.RESERVE_DATE = e.EXAM_DATE
                    AND rh.RESERVE_FLAG = 'H'
                    AND ISNULL(rh.RESERVE_JINRYO, '') <> '3'
                    AND ISNULL(rh.RESERVE_SEQ, 0) <> 3
                    AND rh.RESERVE_STATE NOT IN ('C','Y')
                )
              )
            ORDER BY e.EXAM_DATE, rsv.RESERVE_DATE, rsv.START_TIME, cu.CUST_NAME
