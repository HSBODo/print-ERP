-- =========================================================
-- v_all_exam_list 확장 (V56) — 수술예약·백내장 눈수 파생 컬럼 추가
-- Profile: postgres-mart
--
-- 왜.
--   mart_overall_exam_monthly · mart_overall_exam_weekly 가 종전에 MSSQL 6종 SQL
--   (sql/overall/find-{vision,cataract,dreamlens,stop-count,one-day,demographics}-daily.sql)
--   을 배치 시점에 직접 조회했다. 원천 컬럼(surgery_reserve_date · recommended_r/l) 이
--   이미 list_exam · list_cataract_exam 에 담겨 있으므로 뷰에 노출해
--   배치가 v_all_exam_list 한 곳만 읽고 재집계하도록 통일.
--
-- 추가 컬럼 (뒤에 붙인다).
--   surgery_reserve_date   O 예약 존재 시 예약일 문자열 ('' 이면 예약 없음). booked 판정에 사용.
--   surgery_date           수술 실시일 문자열 ('' 이면 미실시).
--   cataract_eye_count     백내장 추천 눈 수 (0/1/2). recommended_r <> '' 와 recommended_l <> '' 의 합.
--                          list_exam 행(시력교정/드림렌즈)은 항상 0.
--
-- 배치 정합성: mart_overall_exam_* 이관 이후 이 뷰 하나가 검사 도메인 파생 규칙의 SSOT.
--   list_exam 재적재 시점에 담긴 값이 그대로 반영되며, MSSQL 재조회 없음.
--
-- ⚠️ 재기동 idempotency — DROP + CREATE 패턴 (V34·V52 와 동일).
-- ⚠️ 컬럼 순서·이름을 바꾸면 mart_overall_exam_monthly 계산 SQL 도 함께 손대야 함.
-- =========================================================

DROP VIEW IF EXISTS v_all_exam_list CASCADE;
CREATE VIEW v_all_exam_list AS
WITH src AS (
    SELECT exam_date, chart_no, name, exam_category, patient_type,
           motive_l, motive_m, motive_s, job, grade, birth,
           phone1, phone2, email, counselor, doctor, optometrist,
           last_visit, memo, one_day, '' AS classification,
           exam_stop, cancel_code,
           surgery_reserve_date, surgery_date,
           '' AS recommended_r, '' AS recommended_l
      FROM list_exam
    UNION ALL
    -- classification: 백내장 리스트의 분류(백내장/중단/노안·FU/기타, V23)
    SELECT exam_date, chart_no, name, exam_category, patient_type,
           motive_l, motive_m, motive_s, job, grade, birth,
           phone1, phone2, email, counselor, doctor, optometrist,
           last_visit, memo, one_day, classification,
           exam_stop, cancel_code,
           surgery_reserve_date, surgery_date,
           recommended_r, recommended_l
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
    -- 중단 여부·7버킷 파생. (V52)
    COALESCE(exam_stop, '')      AS stop_yn,
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
                WHEN '117' THEN 'other'
                WHEN '304' THEN 'other'
                WHEN '127' THEN 'other'
                WHEN '311' THEN 'other'
                ELSE 'other'
            END
        ELSE ''
    END                          AS stop_reason_bucket,
    -- 수술 예약·실시 파생. (V56)
    COALESCE(surgery_reserve_date, '') AS surgery_reserve_date,
    COALESCE(surgery_date, '')         AS surgery_date,
    -- 백내장 추천 눈 수 (0/1/2). list_exam 행은 항상 0.
    CASE WHEN COALESCE(recommended_r, '') <> '' THEN 1 ELSE 0 END
      + CASE WHEN COALESCE(recommended_l, '') <> '' THEN 1 ELSE 0 END
                                       AS cataract_eye_count
  FROM src;
