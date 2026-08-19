-- =========================================================
-- v_all_exam_list 확장 (V52) — 중단 사유 파생 컬럼 추가
-- Profile: postgres-mart
--
-- 왜.
--   mart_stop_reason_monthly 는 종전에 MSSQL 쪽 별도 쿼리로 계산해 저장했다
--   (find-stop-reason-monthly.sql — EXAM.STOP_YN='Y' + CANCEL_CD → 7버킷).
--   같은 정보(exam_stop, cancel_code)가 이미 list_exam 에 담겨 있으므로
--   정의를 뷰로 승격해 리스트·월별이 **같은 규칙 하나**를 보게 한다.
--   외래수·검사·수술이 먼저 리스트→마트 재집계로 이관된 흐름과 같은 패턴.
--
-- 추가 컬럼 (뒤에 붙인다 — CREATE OR REPLACE 로 재정의 가능).
--   stop_yn                시력교정·백내장 리스트의 exam_stop 원값 (Y/'')
--   stop_reason_bucket     시력교정(EXAM) 중단자에 한해 7버킷 중 하나.
--                          그 외 행(백내장·중단 아님)은 빈 문자열.
--
-- ⚠️ 원본 정의(sql/consultation/find-stop-reason-monthly.sql) 는 EXAM 테이블만 대상이라
--    시력교정 검사자에서만 stop_reason 을 계산한다. 백내장은 Cancel_CD 체계가 달라
--    같은 매핑을 그대로 쓸 수 없으므로 여기서는 계산하지 않는다(빈 문자열).
--
-- 매핑 규칙은 sql/consultation/find-stop-reason-monthly.sql 과 동일:
--   recommendX      121 · 305           수술권유X
--   lensImpossible  122 · 306 · 399     렌즈삽입불가
--   keratoconus     124 · 125 · 308 · 309  원추각막(의심 포함)
--   avellino        126 · 310           아벨리노
--   glaucoma        114 · 303           녹내장
--   visionChange    111 · 302           시력변화
--   other           107 · 199 · 117 · 304 · 127 · 311 + 그 외 미지 코드 (ELSE)
--
-- ⚠️ 재기동 idempotency — V34 도 DROP + CREATE 패턴이라 이 스크립트도 같은 패턴을 쓴다.
--    미래에 이 뷰에 컬럼을 다시 추가/삭제하는 스크립트가 나와도 CREATE OR REPLACE 의
--    "컬럼 축소 금지" 제약에 걸리지 않는다.
-- =========================================================

DROP VIEW IF EXISTS v_all_exam_list CASCADE;
CREATE VIEW v_all_exam_list AS
WITH src AS (
    SELECT exam_date, chart_no, name, exam_category, patient_type,
           motive_l, motive_m, motive_s, job, grade, birth,
           phone1, phone2, email, counselor, doctor, optometrist,
           last_visit, memo, one_day, '' AS classification,
           exam_stop, cancel_code
      FROM list_exam
    UNION ALL
    -- classification: 백내장 리스트의 분류(백내장/중단/노안·FU/기타, V23)
    SELECT exam_date, chart_no, name, exam_category, patient_type,
           motive_l, motive_m, motive_s, job, grade, birth,
           phone1, phone2, email, counselor, doctor, optometrist,
           last_visit, memo, one_day, classification,
           exam_stop, cancel_code
      FROM list_cataract_exam
)
SELECT
    exam_date,
    COALESCE(chart_no, '')      AS chart_no,
    COALESCE(name, '')          AS name,
    COALESCE(exam_category, '') AS exam_group,
    -- 원데이/일반 이진값. 빈칸(해당없음)은 두지 않는다 — 2026-08-05 확정.
    --   시력교정 : list_exam.one_day          (같은날 M/5 예약 내원)
    --   백내장   : list_cataract_exam.one_day (진료구분 C_원데이·C_노안원데이, V32)
    --   드림렌즈 : 구조상 원데이 불가(M 예약이 있으면 시력교정으로 분류) → 항상 '일반'
    CASE WHEN one_day = 'Y' THEN '원데이' ELSE '일반' END AS exam_type,
    COALESCE(classification, '') AS cataract_class,
    COALESCE(patient_type, '')   AS patient_type,
    CASE
        WHEN motive_l IN ('소개고객', '소개미확인') THEN '고객소개'
        WHEN motive_l = '소개직원'                  THEN '직원소개'
        ELSE '일반'
    END                          AS intro_type,
    -- 내원동기(레포트): 내원동기(대) → 레포트 9계열 매핑 (2026-07-30 담당자 엑셀 기준).
    CASE
        WHEN motive_l = 'B2B(군인)'                                THEN 'B2B(군인)'
        WHEN motive_l IN ('B2B(기업)', 'B2B(비앤빛)', 'B2B(백내장)', '제휴') THEN 'B2B(기업)'
        WHEN motive_l IN ('VIP고객관리팀', '소개고객', '소개미확인') THEN '소개고객'
        WHEN motive_l IN ('소개직원', '광고', '바이럴', '프로모션', '홈페이지') THEN motive_l
        ELSE '기타'
    END                          AS motive_report,
    COALESCE(motive_l, '')       AS motive_l,
    COALESCE(motive_m, '')       AS motive_m,
    COALESCE(motive_s, '')       AS motive_s,
    CASE
        WHEN job LIKE '%교사%' OR job LIKE '%교수%' OR job LIKE '%교직원%' OR job LIKE '%강사%' THEN '직장인'
        WHEN job LIKE '%학생%' OR job LIKE '%대학원생%' OR job LIKE '%수험생%'
          OR job LIKE '%재수생%' OR job LIKE '%신입생%'
          OR job SIMILAR TO '초[0-9]%' OR job SIMILAR TO '중[0-9]%' OR job SIMILAR TO '고[0-9]%'
          OR job LIKE '%초등%' OR job LIKE '%중학%' OR job LIKE '%고등%' OR job LIKE '%고3%'
          OR job LIKE '%대학%예정%' OR job LIKE '%졸업%예정%' OR job LIKE '%졸업생%' OR job LIKE '%대입%'
          OR job = 'university' THEN '학생'
        WHEN job LIKE '%군인%' OR job LIKE '%사회복무%' OR job LIKE '%공익근무%' THEN '기타'
        WHEN job = '사무직' THEN '직장인'
        WHEN job IN ('', '.', '무', '無', '무 직', '무직', '없음', 'N', 'None', 'none', '가사', '주부',
                     '휴식', '휴식중', '휴직중', '취업준비', '취업준비중', '취업준비(휴식)', '취업준비/휴식중',
                     '군입대 직전', '입대 전', '기타')
          OR job LIKE '%주부%' OR job LIKE '%취업준비%' OR job LIKE '%취준%'
          OR job LIKE '%퇴직%' OR job LIKE '%은퇴%' OR job LIKE '%휴직%' THEN '기타'
        ELSE '직장인'
    END                          AS job_bucket,
    COALESCE(job, '')            AS job,
    COALESCE(grade, '')          AS grade,
    COALESCE(birth, '')          AS birth,
    COALESCE(phone1, '')         AS phone1,
    COALESCE(phone2, '')         AS phone2,
    COALESCE(email, '')          AS email,
    COALESCE(counselor, '')      AS counselor,
    COALESCE(doctor, '')         AS doctor,
    COALESCE(optometrist, '')    AS optometrist,
    COALESCE(last_visit, '')     AS last_visit,
    COALESCE(memo, '')           AS memo,
    -- 신규: 중단 여부·7버킷 파생. (V52)
    COALESCE(exam_stop, '')      AS stop_yn,
    -- 시력교정(EXAM) 중단자에 한해 7버킷 계산.
    -- '117 · 127' 등 '불가_' 접두 코드는 라벨상 '수술 불가' 계열이지만
    -- 원본 매핑(2026-07-15 결정)에서 '기타(잠정 중단)'로 귀속. 여기서도 동일하게 처리.
    -- ELSE 는 미지 코드 전용 — 새 CANCEL_CD 가 들어오면 조용히 other 로 흘러가므로
    -- 골든 대조에서 other 가 부풀면 이걸 먼저 의심할 것 (docs/db/중단사유-분류-정의.md).
    CASE
        WHEN exam_category = '시력교정' AND exam_stop = 'Y' THEN
            CASE cancel_code
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
                WHEN '117' THEN 'other'   -- 불가_백내장FU
                WHEN '304' THEN 'other'   -- 불가_백내장FU (3xx 짝)
                WHEN '127' THEN 'other'   -- 불가_기타 각막병증
                WHEN '311' THEN 'other'   -- 불가_기타 각막병증 (3xx 짝)
                ELSE 'other'
            END
        ELSE ''
    END                          AS stop_reason_bucket
  FROM src;
