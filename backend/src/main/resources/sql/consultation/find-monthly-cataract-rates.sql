-- 백내장 상담성공률 원본 정의 — 예약 접수 기준(STATE<>'C', 미내원 Y 포함).
--
-- ⚠️ 배치·화면과 정의가 다르다 — 배치·화면(list_cataract_exam)은 실제 내원 기준(STATE NOT IN ('C','Y'))
--    으로 미내원자를 제외한다. 레거시 원장(통계_백내장_내원동기)과 1:1 정합하기 위함이며,
--    상담성공률 정의상 "검사자 = 실제 검사받은 사람" 이 더 자연스럽다(미내원자는 상담도 없음).
--    이 raw MSSQL 정의는 대사(reconcile) 대비용으로만 유지하며 배치는 이 결과를 쓰지 않는다.
--    리스트 정의(미내원 제외)로 mart 가 원본보다 월 20~30명 정도 적게 나오는데, 이는 리스트가
--    정확한 것이지 버그가 아니다(2026-08-12 결정).
            SELECT
                YEAR(D.RESERVE_DATE) AS yr,
                MONTH(D.RESERVE_DATE) AS mo,
                COUNT(DISTINCT D.CUST_NUM) AS examCount,
                COUNT(DISTINCT CASE WHEN op.MIN_OP_RSV IS NOT NULL THEN D.CUST_NUM END) AS surgeryBookedCount,
                COUNT(DISTINCT CASE WHEN B.MY_optometrist IS NOT NULL
                                     AND B.MY_optometrist <> ''
                                     AND B.MY_COUNSELOR = 'BS0808' THEN D.CUST_NUM END) AS stoppedCount
            FROM RESERVATION D WITH(NOLOCK)
            INNER JOIN CUSTOM B WITH(NOLOCK) ON B.CUST_NUM = D.CUST_NUM
            LEFT JOIN (
                SELECT CUST_NUM, MIN(RESERVE_DATE) AS MIN_OP_RSV
                  FROM RESERVATION WITH(NOLOCK)
                 WHERE RESERVE_FLAG = 'O' AND RESERVE_JINRYO = '4' AND RESERVE_STATE <> 'C'
                 GROUP BY CUST_NUM
            ) op ON op.CUST_NUM = D.CUST_NUM
            WHERE D.RESERVE_DATE >= :from AND D.RESERVE_DATE <= :to
                AND D.RESERVE_FLAG = 'H'
                AND D.RESERVE_JINRYO <> '3'
                AND D.RESERVE_STATE <> 'C'
                AND NOT (D.RESERVE_FLAG = 'H' AND D.RESERVE_JINRYO = '1' AND D.RESERVE_SEQ = '3')
                AND D.CUST_NUM <> '9999999999999'
            GROUP BY YEAR(D.RESERVE_DATE), MONTH(D.RESERVE_DATE)
            ORDER BY YEAR(D.RESERVE_DATE), MONTH(D.RESERVE_DATE)
