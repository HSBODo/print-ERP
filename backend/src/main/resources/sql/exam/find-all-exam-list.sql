            -- ⚠️ 여기서 src.isCat = 1 은 "백내장 예약 행" 전부(2026-07 = 102)를 뜻한다.
            --    sql/fragments/exam-session-source.sql 의 isCat 은 뜻이 다르다(백내장 검사수 집계 대상 = 56).
            --    레포트 백내장 검사수와 맞춰야 할 때는 isCat 이 아니라 catClass IN ('백내장','중단') 을 쓸 것.
            SELECT
              ISNULL(LTRIM(RTRIM(src.cn)), '')             AS chartNo,
              ISNULL(cu.CUST_NAME, '')                     AS name,
              ISNULL(src.d, '')                            AS examDate,
              CASE WHEN src.isCat = 1 THEN N'백내장'
                   WHEN vis.hasDreamlens = 1 AND vis.hasMedical = 0 THEN N'드림렌즈'
                   ELSE N'시력교정' END                     AS examGroup,
              -- 원데이/일반 이진값. 빈칸(해당없음)은 두지 않는다 — 2026-08-05 확정.
              --   시력교정 : 같은날 검사OP(M/5) 내원, 중단/취소 제외(레포트 정합)
              --   백내장   : 진료구분 C_원데이(7)·C_노안원데이(9)
              --   드림렌즈 : 구조상 원데이가 불가능(M 예약이 있으면 시력교정으로 분류) → 항상 '일반'
              CASE WHEN src.isOneDay = 1 THEN N'원데이' ELSE N'일반' END AS examType,
              -- 백내장분류: 백내장 리스트의 분류(백내장/중단/노안·FU/기타)를 그대로 쓴다.
              -- 월간 레포트 백내장 검사수 = '백내장' + '중단' 만. 나머지는 전체 검사수에만 들어간다.
              ISNULL(src.catClass, '')                     AS cataractClass,
              CASE WHEN ISNULL(cu.FIRST_DAY, '') >= :from AND ISNULL(cu.FIRST_DAY, '') <= :to
                   THEN N'신환' ELSE N'구환' END            AS patientType,
              CASE WHEN mv.motiveL IN (N'소개고객', N'소개미확인') THEN N'고객소개'
                   WHEN mv.motiveL = N'소개직원' THEN N'직원소개'
                   ELSE N'일반' END                         AS introType,
              -- 내원동기(레포트): 내원동기(대) → 레포트 9계열 매핑. 미기재 포함 그 외 전부 '기타'.
              -- select-all-exam-list.sql·find-exam-count-by-class-monthly.sql(도표 #7)과 동일 규칙 — 함께 고칠 것.
              CASE
                WHEN mv.motiveL = N'B2B(군인)' THEN N'B2B(군인)'
                WHEN mv.motiveL IN (N'B2B(기업)', N'B2B(비앤빛)', N'B2B(백내장)', N'제휴') THEN N'B2B(기업)'
                WHEN mv.motiveL IN (N'소개고객', N'소개미확인', N'VIP고객관리팀') THEN N'소개고객'
                WHEN mv.motiveL IN (N'소개직원', N'광고', N'바이럴', N'프로모션', N'홈페이지') THEN mv.motiveL
                ELSE N'기타'
              END                                          AS motiveReport,
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
                          THEN 1 ELSE 0 END AS isOneDay,
                     CAST(N'' AS NVARCHAR(20)) AS catClass
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
              -- 2026-08-05: 종전 `JINRYO='1' + STATE IN ('I','H')` 는 백내장 리스트·검사 세션 조각과 어긋났다
              --   (2026-07: 여기 59 vs 리스트 56 vs 조각 56). 이제 셋 다 같은 규칙이다 — 함께 고칠 것.
              --   sql/exam/find-cataract-exam-list.sql · sql/fragments/exam-session-source.sql
              SELECT B.CUST_NUM AS cn, D2.RESERVE_DATE AS d, 1 AS isCat,
                     -- 백내장 원데이 = 진료구분 C_원데이(7)·C_노안원데이(9). 그날 예약 중 하나라도 있으면 원데이.
                     -- 시력교정(위 갈래)은 같은날 M/5 예약 내원 기준 — 근거가 다르다.
                     MAX(CASE WHEN ISNULL(D2.RESERVE_JINRYO, '') IN ('7', '9') THEN 1 ELSE 0 END) AS isOneDay,
                     CAST(CASE WHEN opt.v = 1 AND B.MY_COUNSELOR = 'BS0808' THEN N'중단'
                               WHEN opt.v = 1 AND cns.v = 1                 THEN N'백내장'
                               WHEN B.MY_COUNSELOR = 'BS0808'               THEN N'노안/FU'
                               ELSE N'기타' END AS NVARCHAR(20)) AS catClass
              FROM CUSTOM B WITH(NOLOCK)
              JOIN RESERVATION D2 WITH(NOLOCK) ON D2.CUST_NUM = B.CUST_NUM
              CROSS APPLY (SELECT CASE WHEN EXISTS (SELECT 1 FROM EMPLOYEE E1 WITH(NOLOCK)
                                                    WHERE E1.EMP_NUM = B.MY_OPTOMETRIST) THEN 1 ELSE 0 END AS v) opt
              CROSS APPLY (SELECT CASE WHEN EXISTS (SELECT 1 FROM EMPLOYEE E2 WITH(NOLOCK)
                                                    WHERE E2.EMP_NUM = B.MY_COUNSELOR)   THEN 1 ELSE 0 END AS v) cns
              WHERE D2.RESERVE_DATE >= :from AND D2.RESERVE_DATE <= :to
                AND D2.RESERVE_FLAG = 'H'
                AND ISNULL(D2.RESERVE_JINRYO, '') <> '3'
                AND ISNULL(D2.RESERVE_SEQ, 0) <> 3
                AND D2.RESERVE_STATE NOT IN ('C', 'Y')
                AND B.CUST_NUM <> '9999999999999'
                AND NOT (
                  ISNULL(B.CUST_NAME, '') LIKE N'%테스트%'
                  OR LOWER(ISNULL(B.CUST_NAME, '')) LIKE '%test%'
                )
              GROUP BY B.CUST_NUM, D2.RESERVE_DATE,
                       CASE WHEN opt.v = 1 AND B.MY_COUNSELOR = 'BS0808' THEN N'중단'
                            WHEN opt.v = 1 AND cns.v = 1                 THEN N'백내장'
                            WHEN B.MY_COUNSELOR = 'BS0808'               THEN N'노안/FU'
                            ELSE N'기타' END
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
            -- 백내장 갈래와 중복 제거(2026-08-05, find-exam-list.sql·exam-session-source.sql 과 동일 조건):
            -- 백내장 예약(H)으로만 내원한 날의 EXAM 행은 아래 백내장 갈래가 이미 센다.
            -- 위 '순수 외래' 필터가 수술 연계로 통과시켜 같은 사람이 같은 날짜로 2행이 됐다(2026-01~05 실측 4건).
            AND NOT (
              src.isCat = 0
              AND vis.hasMedical = 0
              AND vis.hasDreamlens = 0
              AND EXISTS (SELECT 1 FROM RESERVATION rh WITH(NOLOCK)
                          WHERE rh.CUST_NUM = src.cn AND rh.RESERVE_DATE = src.d
                            AND rh.RESERVE_FLAG = 'H'
                            AND ISNULL(rh.RESERVE_JINRYO, '') <> '3'
                            AND ISNULL(rh.RESERVE_SEQ, 0) <> 3
                            AND rh.RESERVE_STATE NOT IN ('C','Y'))
            )
            ORDER BY src.d, src.isCat, cu.CUST_NAME
