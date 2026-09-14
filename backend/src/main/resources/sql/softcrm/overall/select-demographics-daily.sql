            -- 총검사자·직업구분·소개구분 일별 (월간 레포트 #4~#6·#8~#10, 주간 검사자 종합지표).
            -- 모집단은 sql/softcrm/fragments/fragment-exam-session-source.sql 공유 — 검사수 도표·검사자 리스트와 1:1 정합.
            --   (2026-08-04 이전에는 `EXAM 전부 + Cataract_Exam 전부` 라 popTotal 이 검사수보다 컸다)
            -- popTotal = 검사수(전체). 직업 3분류 합 = popTotal, 소개 3분류 합 = popTotal 이어야 한다.
            SELECT p.d AS d,
                   COUNT(*) AS popTotal,
                   SUM(p.isCat) AS cataractSessions,
                   SUM(CASE WHEN p.jobBucket = N'직장인' THEN 1 ELSE 0 END) AS jobOffice,
                   SUM(CASE WHEN p.jobBucket = N'학생'   THEN 1 ELSE 0 END) AS jobStudent,
                   SUM(CASE WHEN p.jobBucket = N'기타'   THEN 1 ELSE 0 END) AS jobEtc,
                   SUM(CASE WHEN p.motiveL IN (N'소개고객', N'소개미확인') THEN 1 ELSE 0 END) AS introCustomer,
                   SUM(CASE WHEN p.motiveL = N'소개직원' THEN 1 ELSE 0 END) AS introStaff,
                   SUM(CASE WHEN p.motiveL NOT IN (N'소개고객', N'소개미확인', N'소개직원') OR p.motiveL IS NULL THEN 1 ELSE 0 END) AS introGeneral
            FROM (
                SELECT src.d AS d, src.isCat AS isCat,
                       (CASE
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
                        END) AS jobBucket,
                       m.motiveL AS motiveL
                FROM (
__EXAM_SESSION_SOURCE__
                ) src
                LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = src.cn
                CROSS APPLY (SELECT LTRIM(RTRIM(ISNULL(cu.JOB, ''))) AS j) jj
                OUTER APPLY (
                    SELECT TOP 1 ISNULL(m2.category01_name, '') AS motiveL
                    FROM MOTIVE_NEW02 m2 WITH(NOLOCK)
                    WHERE m2.cust_num = src.cn AND m2.Idx = '1'
                    ORDER BY m2.pkey DESC
                ) m
            ) p
            GROUP BY p.d
            ORDER BY p.d
