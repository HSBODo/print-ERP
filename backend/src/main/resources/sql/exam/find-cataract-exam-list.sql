-- 백내장 검사자 리스트 — 백내장검사 예약(RESERVATION FLAG='H') 기준, 고객 × 검사일 1행.
--
-- 레거시 원장: BCRM > 통계(C) > 통계_백내장_내원동기. 레거시 화면 건수와 1:1 (2026-07 = 102).
-- 2026-07-23 모집단 교체 — 종전 Cataract_Exam 행 기준(6월 114건)은 월간 레포트 숫자와 맞지 않았다.
-- 2026-08-05 모집단 확장 — 담당자 필터를 걷어내고 레거시 전체(102)를 싣되 분류로 가른다.
--   종전에는 '백내장'+'중단'만 실어 7월 56행이었고, 레거시 102행 중 46행이 화면에서 사라졌다.
--
-- ⚠️ 건수 불변식 — 월간 레포트 백내장 검사수 = 이 리스트의 분류 '백내장' + '중단' (2026-07 = 45+11 = 56).
--    나머지 분류('노안/FU'·'기타')는 전체 검사수에만 더해진다. sql/fragments/exam-session-source.sql 참조.
--    리스트 전체 행수(102)를 백내장 검사수로 쓰면 안 된다.
--
-- 모집단: 기간 내 백내장검사 예약 내원 — FLAG='H' · JINRYO<>'3'(C_재검사) · SEQ<>3(수술 당일 검사)
--         · STATE NOT IN ('C','Y') · 테스트 고객 제외. 담당자 배정 여부는 거르지 않고 분류로만 쓴다.
--
-- 분류(레거시 CASE 와 동일 구조. 담당자는 CUSTOM 마스터 필드라 방문이 아니라 고객 기준):
--   백내장   검안사 O + 상담사 O
--   중단     검안사 O + 상담사 = 'BS0808'(BS미지정)
--   노안/FU  검안사 X + 상담사 = 'BS0808'  ← 레거시 라벨 'F/U'
--   기타     그 외(검안사 미배정 + 상담사도 BS0808 아님)
--
-- ⚠️ '노안/FU'는 술후 추적이 아니다 — 2026-07 40건 전부 과거 백내장 수술기록이 없고 수술 연계도 0건이다.
--    (37건은 기간 내 백내장 검사기록 보유. 진료실도 전부 '노안/백내장 1·2·3'.)
--    다만 원천에 노안 전용 코드(C_노안원데이·C_노안레이저)로 잡힌 건은 0건이라 '노안'은 정황 판단이다.
-- ⚠️ '기타'를 '미검사'로 부르지 말 것 — 2026-01~07 총 11건 중 2건은 백내장 검사기록이 있다.
-- ⚠️ 레거시의 5번째 분기 '검진'(CUSTOM.ETC LIKE '검진%')은 넣지 않았다. 2026-01~07 실측 0건이라
--    사문화된 분기이고, 해당되면 '기타'로 떨어진다. 되살릴 일이 생기면 여기에 분기를 추가할 것.
--
-- ⚠️ 담당자 판정은 EXISTS(EMPLOYEE) 로 할 것. `MY_OPTOMETRIST IS NOT NULL` 은 빈 문자열이 걸려 분류가 뒤집힌다.
-- ⚠️ 검사일 = 각 H 예약 내원일. 레거시는 역대 최초값(MIN 전 기간)을 쓰는데 조회기간과 무관해 2020년이 찍히는 버그다 — 따르지 않는다.
-- ⚠️ 2026-08-04: 종전 `고객당 1행 + MIN(RESERVE_DATE)` 은 조회기간에 따라 결과가 달라졌다.
--    마트를 연 단위로 적재하면 같은 해에 두 번 내원한 고객이 첫 방문 달로 몰려 이후 달에서 사라진다
--    (2026: 김다연 03-09·07-20 → 07월 56→55). 범위와 무관하도록 고객 × 검사일로 센다.
--    sql/fragments/exam-session-source.sql(레포트 집계)의 백내장 단위와도 일치한다.
-- ⚠️ Cataract_Exam(적절IOL·견적가·검사메모 등)은 LEFT 성격이다. 예약은 있으나 검사기록이 없으면 공백(6월 55명 중 1명).
--
-- READ-ONLY · MSSQL 2014 호환. 날짜는 char(10) 'YYYY-MM-DD'.
            SELECT
              ISNULL(LTRIM(RTRIM(cu.CUST_NUM)), '')        AS chartNo,
              ISNULL(cu.CUST_NAME, '')                     AS name,
              ISNULL(cu.CUST_ENAME, '')                    AS nameEng,
              ISNULL(CH.examDate, '')                      AS examDate,
              ISNULL(
                NULLIF(LTRIM(RTRIM(ms.SUB_NAME)), ''),
                CASE WHEN ISNULL(LTRIM(RTRIM(rsv.RESERVE_FLAG)),'') = 'H' THEN '백내장검사' ELSE '' END
              )                                            AS examType,
              ISNULL(rsvReg.regDate, '')                   AS examRegDate,
              '백내장'                                      AS examCategory,
              CH.classification                             AS classification,
              -- 원데이(백내장) — 그 날 백내장검사 예약 진료구분이 C_원데이(7)·C_노안원데이(9)면 Y.
              -- 시력교정(find-exam-list.sql)은 같은날 M/5 예약 내원 기준이라 근거가 다르다.
              -- 전체 검사자 리스트 원데이 컬럼은 이 값으로 원데이/일반 둘 중 하나가 된다(빈칸 없음).
              CASE WHEN CH.isOneDay = 1 THEN 'Y' ELSE 'N' END AS oneDay,
              CASE WHEN ISNULL(cu.FIRST_DAY, '') >= :from AND ISNULL(cu.FIRST_DAY, '') <= :to
                   THEN '신환' ELSE '구환' END             AS patientType,
              ISNULL(ce.EXAM_MEMO, '')                     AS examMemo,
              LTRIM(RTRIM(
                CASE
                  WHEN ISNULL(NULLIF(LTRIM(RTRIM(ce.OP_ESTIMATE_R)),'0'),'') <> ''
                   AND ISNULL(NULLIF(LTRIM(RTRIM(ce.OP_ESTIMATE_L)),'0'),'') <> ''
                  THEN 'R ' + LTRIM(RTRIM(ce.OP_ESTIMATE_R)) + ' / L ' + LTRIM(RTRIM(ce.OP_ESTIMATE_L))
                  WHEN ISNULL(NULLIF(LTRIM(RTRIM(ce.OP_ESTIMATE_R)),'0'),'') <> '' THEN LTRIM(RTRIM(ce.OP_ESTIMATE_R))
                  WHEN ISNULL(NULLIF(LTRIM(RTRIM(ce.OP_ESTIMATE_L)),'0'),'') <> '' THEN LTRIM(RTRIM(ce.OP_ESTIMATE_L))
                  ELSE '' END
              ))                                           AS estimate,
              ISNULL(ce.ExamPercent, '')                   AS surgeryRate,
              ISNULL(rsv.START_TIME, '')                   AS examTime,
              ISNULL(ce.OPERATIONR, '')                    AS recommendedR,
              ISNULL(ce.OPERATIONL, '')                    AS recommendedL,
              ISNULL(opReg.regDate, '')                    AS surgeryRegDate,
              ISNULL(opRsv.RESERVE_DATE, '')               AS surgeryReserveDate,
              ISNULL(COALESCE(NULLIF(LTRIM(RTRIM(op.OPERATIONR_DATE)),''), NULLIF(LTRIM(RTRIM(op.OPERATIONL_DATE)),'')), '') AS surgeryDate,
              ISNULL(op.OPERATIONR, '')                    AS surgeryR,
              ISNULL(op.OPERATIONL, '')                    AS surgeryL,
              ISNULL(COALESCE(NULLIF(LTRIM(RTRIM(osr.EMP_NAME)),''), NULLIF(LTRIM(RTRIM(osl.EMP_NAME)),'')), '') AS surgeon,
              ISNULL(REPLACE(CONVERT(varchar(30), CONVERT(money, NULLIF(pay.RECEIPT, 0)), 1), '.00', ''), '') AS payment,
              ISNULL(ec.EMP_NAME, '')                      AS counselor,
              ISNULL(ed.EMP_NAME, '')                      AS doctor,
              ''                                           AS jumin,
              ISNULL(cu.BIRTH_DAY, '')                     AS birth,
              CASE WHEN cu.LUNAR_YN = 'Y' THEN '음' ELSE '양' END AS lunar,
              ISNULL(cu.CALL_NUM1, '')                     AS phone1,
              ISNULL(cu.CALL_NUM2, '')                     AS phone2,
              ISNULL(cu.EMAIL, '')                         AS email,
              ISNULL(LTRIM(RTRIM(cu.ZIP_CODE)), '')        AS zip,
              ISNULL(cu.ADDR1, '')                         AS addr1,
              ISNULL(cu.ADDR2, '')                         AS addr2,
              ISNULL(cu.ETC, '')                           AS memo,
              ISNULL(LTRIM(RTRIM(ce.Stop_YN)), '')         AS examStop,
              ISNULL(LTRIM(RTRIM(ce.Impossible)), '')      AS opImpossible,
              ISNULL(rsv.RESERVE_PATH, '')                 AS route,
              ISNULL(motive.section, '')                   AS section,
              ISNULL(motive.motiveL, '')                   AS motiveL,
              ISNULL(motive.motiveM, '')                   AS motiveM,
              ISNULL(motive.motiveS, '')                   AS motiveS,
              ISNULL(motive.motiveMemo, '')                AS motiveMemo,
              ISNULL(eo.EMP_NAME, '')                      AS optometrist,
              ISNULL(LTRIM(RTRIM(ce.Cancel_CD)), '')       AS cancelCode,
              ISNULL(NULLIF(ce.Cancel_reason, ''), ISNULL(cc.CANCEL_REASON, '')) AS cancelMemo,
              ISNULL(cu.LEVEL, '')                         AS grade,
              ISNULL(cu.JOB, '')                           AS job,
              ISNULL(cu.LAST_DAY, '')                      AS lastVisit,
              ISNULL(ins.EtcCodNam, '')                    AS insurance,
              ISNULL(nation.Nation_CodeName, '')           AS nationality
            FROM (
              SELECT B.CUST_NUM,
                     D.RESERVE_DATE AS examDate,
                     -- 그 날 예약이 여러 건이면 하나라도 원데이면 원데이로 본다(MAX).
                     MAX(CASE WHEN ISNULL(D.RESERVE_JINRYO, '') IN ('7', '9') THEN 1 ELSE 0 END) AS isOneDay,
                     CASE WHEN opt.v = 1 AND B.MY_COUNSELOR = 'BS0808' THEN N'중단'
                          WHEN opt.v = 1 AND cns.v = 1                 THEN N'백내장'
                          WHEN B.MY_COUNSELOR = 'BS0808'               THEN N'노안/FU'
                          ELSE N'기타' END AS classification
              FROM CUSTOM B WITH(NOLOCK)
              JOIN RESERVATION D WITH(NOLOCK) ON D.CUST_NUM = B.CUST_NUM
              CROSS APPLY (SELECT CASE WHEN EXISTS (SELECT 1 FROM EMPLOYEE E WITH(NOLOCK)
                                                    WHERE E.EMP_NUM = B.MY_OPTOMETRIST) THEN 1 ELSE 0 END AS v) opt
              CROSS APPLY (SELECT CASE WHEN EXISTS (SELECT 1 FROM EMPLOYEE E WITH(NOLOCK)
                                                    WHERE E.EMP_NUM = B.MY_COUNSELOR)   THEN 1 ELSE 0 END AS v) cns
              WHERE D.RESERVE_DATE >= :from AND D.RESERVE_DATE <= :to
                AND D.RESERVE_FLAG = 'H'
                AND ISNULL(D.RESERVE_JINRYO, '') <> '3'
                AND ISNULL(D.RESERVE_SEQ, 0) <> 3
                AND D.RESERVE_STATE NOT IN ('C', 'Y')
                AND B.CUST_NUM <> '9999999999999'
                AND NOT (
                  ISNULL(B.CUST_NAME, '') LIKE N'%테스트%'
                  OR LOWER(ISNULL(B.CUST_NAME, '')) LIKE '%test%'
                )
              GROUP BY B.CUST_NUM, D.RESERVE_DATE,
                       CASE WHEN opt.v = 1 AND B.MY_COUNSELOR = 'BS0808' THEN N'중단'
                            WHEN opt.v = 1 AND cns.v = 1                 THEN N'백내장'
                            WHEN B.MY_COUNSELOR = 'BS0808'               THEN N'노안/FU'
                            ELSE N'기타' END
            ) CH
            JOIN CUSTOM cu WITH(NOLOCK)                       ON cu.CUST_NUM = CH.CUST_NUM
            OUTER APPLY (
              SELECT TOP 1 c.*
              FROM Cataract_Exam c WITH(NOLOCK)
              WHERE c.CUST_NUM = CH.CUST_NUM
                AND c.EXAM_DATE >= :from AND c.EXAM_DATE <= :to
              ORDER BY CASE WHEN c.EXAM_DATE = CH.examDate THEN 0 ELSE 1 END, c.EXAM_DATE, c.SEQ DESC
            ) ce
            LEFT JOIN Cataract_Operationdata op WITH(NOLOCK)  ON op.CUST_NUM = CH.CUST_NUM
            LEFT JOIN EMPLOYEE osr WITH(NOLOCK)               ON op.OPERATIONR_DOC = osr.EMP_NUM
            LEFT JOIN EMPLOYEE osl WITH(NOLOCK)               ON op.OPERATIONL_DOC = osl.EMP_NUM
            LEFT JOIN EMPLOYEE ec WITH(NOLOCK)                ON cu.MY_COUNSELOR   = ec.EMP_NUM
            LEFT JOIN EMPLOYEE ed WITH(NOLOCK)                ON cu.MY_DOCTOR      = ed.EMP_NUM
            LEFT JOIN EMPLOYEE eo WITH(NOLOCK)                ON cu.MY_OPTOMETRIST = eo.EMP_NUM
            LEFT JOIN CANCEL_CFG cc WITH(NOLOCK)              ON ce.Cancel_CD      = cc.CANCEL_CD
            LEFT JOIN NationCustom_CFG nation WITH(NOLOCK)    ON cu.Nation_code    = nation.Code
            LEFT JOIN EtcCfg ins WITH(NOLOCK)
              ON ins.EtcBseCod = 'InsuranceCfg' AND ins.EtcCod = cu.InsuranceCode
            OUTER APPLY (
              SELECT TOP 1 r.RESERVE_FLAG, r.RESERVE_JINRYO, r.START_TIME, r.RESERVE_PATH, r.RESERVE_NUM
              FROM RESERVATION r WITH(NOLOCK)
              WHERE r.CUST_NUM = CH.CUST_NUM AND r.RESERVE_DATE = CH.examDate
                AND r.RESERVE_STATE NOT IN ('C','Y') AND r.RESERVE_FLAG = 'H'
              ORDER BY r.RESERVE_NUM DESC
            ) rsv
            LEFT JOIN MEDICAL_SUB_CFG ms WITH(NOLOCK)
              ON ms.RESERVE_FLAG = rsv.RESERVE_FLAG AND ms.SUB_FLAG = ISNULL(rsv.RESERVE_JINRYO, '')
            OUTER APPLY (
              SELECT CASE WHEN LEN(LTRIM(RTRIM(ISNULL(rsv.RESERVE_NUM, '')))) >= 6
                          THEN '20' + SUBSTRING(LTRIM(RTRIM(rsv.RESERVE_NUM)), 1, 2)
                             + '-' + SUBSTRING(LTRIM(RTRIM(rsv.RESERVE_NUM)), 3, 2)
                             + '-' + SUBSTRING(LTRIM(RTRIM(rsv.RESERVE_NUM)), 5, 2)
                          ELSE '' END AS regDate
            ) rsvReg
            OUTER APPLY (
              SELECT TOP 1 f.RESERVE_DATE, f.RESERVE_NUM
              FROM RESERVATION f WITH(NOLOCK)
              WHERE f.CUST_NUM = CH.CUST_NUM AND f.RESERVE_FLAG = 'O'
                AND f.RESERVE_JINRYO = '4'            -- 백내장 수술만(레거시 기준). 미지정 시 시력교정 수술예약이 섞임
                AND f.RESERVE_STATE <> 'C'
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
              WHERE m2.cust_num = CH.CUST_NUM AND m2.Idx = '1'
              ORDER BY m2.pkey DESC
            ) motive
            LEFT JOIN (
              SELECT TMP.PRC_CUSNUM, SUM(TMP.RECEIPT) AS RECEIPT
              FROM (
                SELECT A.CUST_NUM AS PRC_CUSNUM, SUM(ISNULL(A.COST_PRICE, 0)) AS RECEIPT
                FROM COSTPRICE A WITH(NOLOCK)
                LEFT JOIN (SELECT CstCusNum, CstSeq FROM CSTPRCSUB WITH(NOLOCK) GROUP BY CstCusNum, CstSeq) B
                  ON A.CUST_NUM = B.CstCusNum AND A.SEQ = B.CstSeq
                LEFT JOIN (SELECT PrcCusNum, PrcSeq FROM PRCITMLST WITH(NOLOCK) GROUP BY PrcCusNum, PrcSeq) C
                  ON A.CUST_NUM = C.PrcCusNum AND A.SEQ = C.PrcSeq
                WHERE B.CstCusNum IS NULL AND C.PrcCusNum IS NULL
                  AND A.COST_FLAG IN ('O','I','H') AND UPPER(ISNULL(A.PayStt, '')) <> 'A'
                GROUP BY A.CUST_NUM
                UNION ALL
                SELECT B.CstCusNum AS PRC_CUSNUM, SUM(ISNULL(B.CstPrc, 0)) AS RECEIPT
                FROM COSTPRICE A WITH(NOLOCK)
                JOIN CSTPRCSUB B WITH(NOLOCK)
                  ON A.CUST_NUM = B.CstCusNum AND A.SEQ = B.CstSeq
                 AND A.COST_FLAG IN ('O','I','H') AND B.CstCnlYnN = 'N' AND B.CstPayTyp = 'N'
                LEFT JOIN PRCITMLST C WITH(NOLOCK) ON B.CstCusNum = C.PrcCusNum AND B.CstSeq = C.PrcSeq
                WHERE C.PrcCusNum IS NULL AND UPPER(ISNULL(A.PayStt, '')) <> 'A'
                GROUP BY B.CstCusNum
                UNION ALL
                SELECT T2.CUST_NUM AS PRC_CUSNUM,
                       SUM(CASE D.PrcCnlYnN WHEN 'Y' THEN 0 ELSE ISNULL(D.PrcDtlPrc, 0) END) AS RECEIPT
                FROM (SELECT DISTINCT A.CUST_NUM, A.SEQ FROM COSTPRICE A WITH(NOLOCK)
                      WHERE ISNULL(A.COST_FLAG, '') = '' AND UPPER(ISNULL(A.PayStt, '')) <> 'A') T2
                JOIN PRCITMLST C WITH(NOLOCK) ON T2.CUST_NUM = C.PrcCusNum AND T2.SEQ = C.PrcSeq AND C.PrcCod IN ('O','I','H')
                JOIN PrcItmDtl D WITH(NOLOCK)  ON T2.CUST_NUM = D.PrcCusNum AND T2.SEQ = D.PrcSeq AND D.PrcCod IN ('O','I','H')
                GROUP BY T2.CUST_NUM
              ) TMP
              GROUP BY TMP.PRC_CUSNUM
            ) pay ON pay.PRC_CUSNUM = CH.CUST_NUM AND CH.CUST_NUM <> '9999999999999'
            ORDER BY CH.examDate, rsv.START_TIME, cu.CUST_NAME
