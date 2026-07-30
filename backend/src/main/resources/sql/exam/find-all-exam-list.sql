            SELECT
              ISNULL(LTRIM(RTRIM(src.cn)), '')             AS chartNo,
              ISNULL(cu.CUST_NAME, '')                     AS name,
              ISNULL(src.d, '')                            AS examDate,
              CASE WHEN src.isCat = 1 THEN N'백내장'
                   WHEN vis.hasDreamlens = 1 AND vis.hasMedical = 0 THEN N'드림렌즈'
                   ELSE N'시력교정' END                     AS examGroup,
              -- 원데이/일반 구분(시력교정 한정). 원데이 = 같은날 검사OP(M/5) 내원, 중단/취소 제외(레포트 정합).
              CASE WHEN src.isCat = 1 THEN ''
                   WHEN vis.hasDreamlens = 1 AND vis.hasMedical = 0 THEN ''
                   WHEN src.isOneDay = 1 THEN N'원데이'
                   ELSE N'일반' END                         AS examType,
              -- 백내장분류: 백내장 리스트의 분류와 동일 기준(상담사 BS0808=BS미지정 → 중단, 그 외 → 백내장).
              CASE WHEN src.isCat = 1 AND cu.MY_COUNSELOR = 'BS0808' THEN N'중단'
                   WHEN src.isCat = 1 THEN N'백내장'
                   ELSE '' END                              AS cataractClass,
              CASE WHEN ISNULL(cu.FIRST_DAY, '') >= :from AND ISNULL(cu.FIRST_DAY, '') <= :to
                   THEN N'신환' ELSE N'구환' END            AS patientType,
              CASE WHEN mv.motiveL IN (N'소개고객', N'소개미확인') THEN N'고객소개'
                   WHEN mv.motiveL = N'소개직원' THEN N'직원소개'
                   ELSE N'일반' END                         AS introType,
              ISNULL(mv.motiveL, '')                       AS motiveL,
              ISNULL(mv.motiveM, '')                       AS motiveM,
              ISNULL(mv.motiveS, '')                       AS motiveS,
              CASE
                WHEN jj.j LIKE N'%교사%' OR jj.j LIKE N'%교수%' OR jj.j LIKE N'%교직원%' OR jj.j LIKE N'%강사%' THEN N'직장인'
                WHEN jj.j LIKE N'%학생%' OR jj.j LIKE N'%대학원생%' OR jj.j LIKE N'%수험생%'
                  OR jj.j LIKE N'%재수생%' OR jj.j LIKE N'%신입생%'
                  OR jj.j LIKE N'초[0-9]%' OR jj.j LIKE N'중[0-9]%' OR jj.j LIKE N'고[0-9]%'
                  OR jj.j LIKE N'%초등%' OR jj.j LIKE N'%중학%' OR jj.j LIKE N'%고등%' OR jj.j LIKE N'%고3%'
                  OR jj.j LIKE N'%대학%예정%' OR jj.j LIKE N'%졸업%예정%' OR jj.j LIKE N'%졸업생%' OR jj.j LIKE N'%대입%'
                  OR jj.j = 'university' THEN N'학생'
                WHEN jj.j LIKE N'%군인%' OR jj.j LIKE N'%사회복무%' OR jj.j LIKE N'%공익근무%' THEN N'기타'
                WHEN jj.j = N'사무직' THEN N'직장인'
                WHEN jj.j IN ('', '.', N'무', N'無', N'무 직', N'무직', N'없음', 'N', 'None', 'none', N'가사', N'주부',
                              N'휴식', N'휴식중', N'휴직중', N'취업준비', N'취업준비중', N'취업준비(휴식)', N'취업준비/휴식중',
                              N'군입대 직전', N'입대 전', N'기타')
                  OR jj.j LIKE N'%주부%' OR jj.j LIKE N'%취업준비%' OR jj.j LIKE N'%취준%'
                  OR jj.j LIKE N'%퇴직%' OR jj.j LIKE N'%은퇴%' OR jj.j LIKE N'%휴직%' THEN N'기타'
                ELSE N'직장인'
              END                                          AS jobBucket,
              ISNULL(cu.JOB, '')                           AS job,
              ISNULL(cu.LEVEL, '')                         AS grade,
              ISNULL(cu.BIRTH_DAY, '')                     AS birth,
              ISNULL(cu.CALL_NUM2, '')                     AS phone2,
              ISNULL(cu.CALL_NUM1, '')                     AS phone1,
              ISNULL(cu.EMAIL, '')                         AS email,
              ISNULL(ec.nm, '')                            AS counselor,
              ISNULL(ed.nm, '')                            AS doctor,
              ISNULL(eo.nm, '')                            AS optometrist,
              ISNULL(cu.LAST_DAY, '')                      AS lastVisit,
              ISNULL(cu.ETC, '')                           AS memo
            FROM (
              SELECT e.CUST_NUM AS cn, e.EXAM_DATE AS d, 0 AS isCat,
                     -- 원데이 검사: 같은날 시력교정 검사OP 예약(M/5, 내원 I/H), 테스트메모만 제외.
                     -- 2026-07-30 확정: 중단/취소(STOP_YN·CANCEL_CD) 단서 제거 (점검/원데이-레거시-비교 §5).
                     CASE WHEN NOT (ISNULL(e.EXAM_MEMO, '') LIKE N'%테스트%' OR LOWER(ISNULL(e.EXAM_MEMO, '')) LIKE '%test%')
                           AND EXISTS (SELECT 1 FROM RESERVATION r WITH(NOLOCK)
                                       WHERE r.CUST_NUM = e.CUST_NUM AND r.RESERVE_DATE = e.EXAM_DATE
                                         AND r.RESERVE_FLAG = 'M' AND r.RESERVE_JINRYO = '5' AND r.RESERVE_STATE IN ('I','H'))
                          THEN 1 ELSE 0 END AS isOneDay
              FROM EXAM e WITH(NOLOCK)
              JOIN CUSTOM cux WITH(NOLOCK) ON e.CUST_NUM = cux.CUST_NUM
              WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
                -- 리포트(findVisionCorrectionMonthly)와 1:1 정합: 테스트 고객 + 백내장스텁(같은날 백내장검사 존재 & EXAM 측정값 전무) 제외
                AND NOT (ISNULL(cux.CUST_NAME, '') LIKE N'%테스트%' OR LOWER(ISNULL(cux.CUST_NAME, '')) LIKE '%test%')
                AND NOT (
                  EXISTS (SELECT 1 FROM Cataract_Exam ce WITH(NOLOCK)
                          WHERE ce.CUST_NUM = e.CUST_NUM AND ce.EXAM_DATE = e.EXAM_DATE)
                  AND __EXAM_MEASUREMENTS_BLANK__
                )
              UNION ALL
              -- 백내장은 사람(고객) 단위: 레거시 BCRM "백내장_검사" 화면과 동일하게 RESERVATION 기준.
              -- FLAG='H'(백내장) + JINRYO='1'(백내장검사 진료) + STATE 내원(I/H), 고객·검사일별 1행.
              SELECT a.CUST_NUM AS cn, a.RESERVE_DATE AS d, 1 AS isCat, 0 AS isOneDay
              FROM RESERVATION a WITH(NOLOCK)
              WHERE a.RESERVE_DATE >= :from AND a.RESERVE_DATE <= :to
                AND a.RESERVE_STATE IN ('I','H')
                AND a.RESERVE_FLAG = 'H'
                AND a.RESERVE_JINRYO = '1'
              GROUP BY a.CUST_NUM, a.RESERVE_DATE
            ) src
            LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = src.cn
            OUTER APPLY (
              -- 검사구분 드림렌즈/시력교정 분리: 검사일에 드림렌즈예약(RESERVE_FLAG='D')만 있고 의료예약('M') 없으면 드림렌즈
              -- (검사자 리스트와 동일 기준). 백내장(isCat=1)은 이 플래그와 무관하게 '백내장'.
              SELECT
                CASE WHEN EXISTS (SELECT 1 FROM RESERVATION rd WITH(NOLOCK)
                                   WHERE rd.CUST_NUM = src.cn AND rd.RESERVE_DATE = src.d
                                     AND rd.RESERVE_STATE IN ('I','H') AND rd.RESERVE_FLAG = 'D') THEN 1 ELSE 0 END AS hasDreamlens,
                CASE WHEN EXISTS (SELECT 1 FROM RESERVATION rm WITH(NOLOCK)
                                   WHERE rm.CUST_NUM = src.cn AND rm.RESERVE_DATE = src.d
                                     AND rm.RESERVE_STATE IN ('I','H') AND rm.RESERVE_FLAG = 'M') THEN 1 ELSE 0 END AS hasMedical
            ) vis
            CROSS APPLY (SELECT LTRIM(RTRIM(ISNULL(cu.JOB, ''))) AS j) jj
            OUTER APPLY (
              SELECT TOP 1 ISNULL(m2.category01_name, '') AS motiveL,
                           ISNULL(m2.category02_name, '') AS motiveM,
                           ISNULL(m2.category03_name, '') AS motiveS
              FROM MOTIVE_NEW02 m2 WITH(NOLOCK)
              WHERE m2.cust_num = src.cn AND m2.Idx = '1'
              ORDER BY m2.pkey DESC
            ) mv
            OUTER APPLY (SELECT TOP 1 ISNULL(EMP_NAME, '') AS nm FROM EMPLOYEE WITH(NOLOCK) WHERE EMP_NUM = cu.MY_COUNSELOR) ec
            OUTER APPLY (SELECT TOP 1 ISNULL(EMP_NAME, '') AS nm FROM EMPLOYEE WITH(NOLOCK) WHERE EMP_NUM = cu.MY_DOCTOR) ed
            OUTER APPLY (SELECT TOP 1 ISNULL(EMP_NAME, '') AS nm FROM EMPLOYEE WITH(NOLOCK) WHERE EMP_NUM = cu.MY_OPTOMETRIST) eo
            -- 순수 외래 유입 제외(2026-07-30 확정, docs/점검/시력교정-검사자_2026-06~07.md):
            -- 시력교정 그룹(isCat=0, 드림렌즈 아님) 중 그날 검사(M) 내원도 수술 연계도 없는 행 제외.
            -- find-exam-list.sql 의 hasSurgeryLink 와 동일 기준. 백내장·드림렌즈 그룹은 영향 없음.
            WHERE NOT (
              src.isCat = 0
              AND vis.hasMedical = 0
              AND vis.hasDreamlens = 0
              AND NOT EXISTS (SELECT 1 FROM RESERVATION ro WITH(NOLOCK)
                              WHERE ro.CUST_NUM = src.cn AND ro.RESERVE_FLAG = 'O'
                                AND ro.RESERVE_STATE <> 'C' AND ro.RESERVE_DATE >= src.d)
              AND NOT EXISTS (SELECT 1 FROM OPERATIONDATA od WITH(NOLOCK)
                              WHERE od.CUST_NUM = src.cn AND ISNULL(od.OPERATION_DATE, '') <> ''
                                AND od.OPERATION_DATE >= src.d)
            )
            ORDER BY src.d, src.isCat, cu.CUST_NAME
