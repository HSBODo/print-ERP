-- 검사 중단(EXAM.STOP_YN='Y') 건을 상담사가 드롭다운에서 고른 정형 코드 EXAM.CANCEL_CD(char(3))로
-- 7개 사유 버킷에 분류한다. 코드 마스터는 CANCEL_CFG (CANCEL_CD → CANCEL_REASON).
--
-- 매핑 — 코드군이 두 벌이다: 1xx(검사 중단) / 3xx(동일 라벨 세트).
--        같은 사유가 두 코드로 들어오므로 새 코드를 추가할 땐 짝이 있는지 확인할 것.
--   recommendX      불가-수술권유X      121 · 305
--   lensImpossible  불가-렌즈삽입불가   122 · 306 · 399
--   keratoconus     불가-원추각막       124 · 125 · 308 · 309   (원추각막 · 의심)
--   avellino        불가-아벨리노       126 · 310
--   glaucoma        불가-녹내장         114 · 303
--   visionChange    불가-시력변화       111 · 302
--   other           기타                107 전안부재검 · 199 기타/메모
--                                       + 117 · 304 불가_백내장FU        (결정: 잠정 중단)
--                                       + 127 · 311 불가_기타 각막병증   (결정: 잠정 중단)
--                                       + 그 외 미지 코드 · 코드없음 (ELSE)
--
-- 그룹: other · glaucoma · visionChange = '잠정 중단' / 나머지 4개 = '수술 불가'.
--   117 · 127 은 라벨이 '불가_' 로 시작하지만 기타(=잠정 중단)로 귀속하기로 결정했다(2026-07-15).
--
-- ⚠️ ELSE 로 떨어지는 코드는 에러 없이 조용히 other 가 된다. 운영에 새 CANCEL_CD 가 생겨도
--    티가 안 나고 기타만 부푼다. 골든 대조에서 기타가 부풀면 이걸 먼저 의심할 것
--    (docs/db/중단사유-분류-정의.md §검증 쿼리 1번). 검토를 마친 코드는 위처럼 WHEN 으로 명시할 것.
-- ⚠️ CANCEL_CD 는 이름과 달리 '취소 플래그'가 아니라 '중단 사유 코드'다. 다른 쿼리들은 같은 컬럼을
--    취소 판정(ISNULL(e.CANCEL_CD,'') = '')에 쓴다 — 한쪽 의미로만 알고 고치면 다른 쪽이 깨진다.
--
-- 매핑을 바꾸는 법·검증 쿼리·함정: docs/db/중단사유-분류-정의.md
--
-- ⚠️ 배치·화면과 정의가 다르다 — 배치·화면은 sql/mart/select-stop-reason-daily-agg.sql 이 담당하며
--    list_exam 을 거쳐 select-exam-list.sql 의 필터(테스트 이름·pure cataract empty·순수 외래 유입·
--    백내장 중복) 4개가 이미 적용된 population 을 본다. 이 raw EXAM 조회는 그 필터를 무시하므로
--    reconcile 결과 mart 가 원본보다 월 최대 4건 정도 적을 수 있는데, 이는 리스트 정의 개선의
--    부산물이지 버그가 아니다(2026-08-12 결정). 원본 SQL 은 대사(reconcile) 대비용으로만 유지한다.
            SELECT t.yr, t.mo,
                   SUM(CASE WHEN t.cat = 'recommendX'    THEN 1 ELSE 0 END) AS recommendX,
                   SUM(CASE WHEN t.cat = 'lensImpossible' THEN 1 ELSE 0 END) AS lensImpossible,
                   SUM(CASE WHEN t.cat = 'keratoconus'   THEN 1 ELSE 0 END) AS keratoconus,
                   SUM(CASE WHEN t.cat = 'avellino'      THEN 1 ELSE 0 END) AS avellino,
                   SUM(CASE WHEN t.cat = 'glaucoma'      THEN 1 ELSE 0 END) AS glaucoma,
                   SUM(CASE WHEN t.cat = 'visionChange'  THEN 1 ELSE 0 END) AS visionChange,
                   SUM(CASE WHEN t.cat = 'other'         THEN 1 ELSE 0 END) AS other
            FROM (
                SELECT CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT) AS yr,
                       CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT) AS mo,
                       CASE LTRIM(RTRIM(ISNULL(e.CANCEL_CD, '')))
                           WHEN '121' THEN 'recommendX'
                           WHEN '305' THEN 'recommendX'
                           WHEN '122' THEN 'lensImpossible'
                           WHEN '306' THEN 'lensImpossible'
                           WHEN '399' THEN 'lensImpossible'
                           WHEN '124' THEN 'keratoconus'
                           WHEN '125' THEN 'keratoconus'
                           WHEN '308' THEN 'keratoconus'
                           WHEN '309' THEN 'keratoconus'
                           WHEN '126' THEN 'avellino'
                           WHEN '310' THEN 'avellino'
                           WHEN '114' THEN 'glaucoma'
                           WHEN '303' THEN 'glaucoma'
                           WHEN '111' THEN 'visionChange'
                           WHEN '302' THEN 'visionChange'
                           -- 아래 4개는 '불가_' 코드지만 검토 결과 기타(잠정 중단)로 귀속하기로 결정한 것.
                           -- ELSE 로 흘려보내지 않고 명시해 둔다 — 그래야 '검토해서 기타로 정한 코드'와
                           -- '아무도 몰라서 샌 코드'가 구분된다(ELSE 는 미지 코드 전용으로 남긴다).
                           WHEN '117' THEN 'other'   -- 불가_백내장FU
                           WHEN '304' THEN 'other'   -- 불가_백내장FU (3xx 짝)
                           WHEN '127' THEN 'other'   -- 불가_기타 각막병증
                           WHEN '311' THEN 'other'   -- 불가_기타 각막병증 (3xx 짝)
                           ELSE 'other'
                       END AS cat
                FROM EXAM e WITH(NOLOCK)
                WHERE e.STOP_YN = 'Y'
                  AND e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
            ) t
            GROUP BY t.yr, t.mo
            ORDER BY t.yr, t.mo
