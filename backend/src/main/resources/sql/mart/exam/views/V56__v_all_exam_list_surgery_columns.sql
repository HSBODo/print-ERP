-- =========================================================
-- v_all_exam_list — list_exam + list_cataract_exam 위의 통합 파생 뷰 (V56 최종 정의)
-- Profile: postgres-mart
--
-- 왜 뷰인가 (V34 배경).
--   검사구분·원데이·유입·직업·백내장분류 같은 파생값이 종전에는 리스트 화면·MSSQL 레포트에
--   각자 구현되어 있어 정의가 바뀌면 여러 곳을 찾아 고쳐야 했고 하나 빠뜨리면 조용히 어긋났다
--   (2026-08-05 원데이 3건 사례). 뷰로 승격해 리스트·월별·주차·배치가 **같은 정의 하나**를 본다.
--
-- 원본 저장 없음 — 파생 규칙만 담는다.
--   원본 행은 이미 list_exam / list_cataract_exam 에 있고 이 뷰는 그 위의 파생일 뿐이다.
--   list_exam 재적재 시점에 담긴 값이 그대로 반영되며, MSSQL 재조회 없음.
--
-- 커버리지 — 2026-01 이후 행만 있다 (그 전은 마트에 리스트가 없다).
--   2024·2025 와 2026-01~05 레포트 값은 골든 시드가 우선이며 이 뷰와 무관하다.
--
-- 계승 이력 (V56 이 세 세대 정의를 완전 재작성해 담고 있음):
--   V34 → 기본 파생 컬럼 (검사구분·유입·직업 등)
--   V52 → + stop_yn · stop_reason_bucket 파생 (아래 stop_reason 규칙 참조)
--   V56 → + surgery_reserve_date · surgery_date · cataract_eye_count
--   V56 (2026-10-22 보완) → intro_type CASE 에 'VIP고객관리팀' 포함
--     motive_report 는 'VIP고객관리팀' 을 '소개고객' 으로 묶는데 intro_type 은 '일반' 으로
--     흘려보내 "검사자 리스트 소개구분" 과 "레포트 유입채널" 숫자가 어긋나는 문제가 있었다.
--     담당자 결정(motive_report 의 넓은 정의 기준) 을 intro_type 에도 반영 — 두 지표 일관성 확보.
--   ⚠️ V56 이 완전 재정의라 V34·V52 는 MartSchemaInitializer 에서 제외됨.
--
-- 배치 정합성: mart_overall_exam_* 이관 이후 이 뷰 하나가 검사 도메인 파생 규칙의 SSOT.
--   mart_overall_exam_monthly · mart_overall_exam_weekly 가 종전에 MSSQL 6종 SQL
--   (sql/softcrm/overall/select-{vision,cataract,dreamlens,stop-count,one-day,demographics}-daily.sql)
--   을 배치 시점에 직접 조회하던 걸 이 뷰 하나로 통일.
--
-- 추가 컬럼 (V56).
--   surgery_reserve_date   O 예약 존재 시 예약일 문자열 ('' 이면 예약 없음). booked 판정에 사용.
--   surgery_date           수술 실시일 문자열 ('' 이면 미실시).
--   cataract_eye_count     백내장 추천 눈 수 (0/1/2). recommended_r <> '' + recommended_l <> ''.
--                          list_exam 행(시력교정/드림렌즈)은 항상 0.
--
-- stop_reason 규칙 (V52 계승 · 아래 SELECT 절 CASE 참조):
--   ⚠️ 시력교정(EXAM) 중단자만 대상 — 원본 sql/softcrm/consultation/select-stop-reason-monthly.sql 과 동일.
--      백내장은 Cancel_CD 체계가 달라 같은 매핑을 그대로 쓸 수 없어 여기서는 계산하지 않는다(빈 문자열).
--   7버킷: recommendX · lensImpossible · keratoconus · avellino · glaucoma · visionChange · other
--   '117 · 127' 등 '불가_' 접두 코드는 라벨상 '수술 불가' 이지만 원본 매핑(2026-07-15 결정)에서
--   '기타(잠정 중단)' 로 귀속. ELSE 는 미지 코드 전용 — 새 CANCEL_CD 가 들어오면 other 로 흘러감.
--
-- ⚠️ 재기동 idempotency — DROP + CREATE 패턴. CREATE OR REPLACE 는 컬럼 축소를 못 해서 이 패턴 도입.
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
    --   시력교정 : list_exam.one_day          (같은날 M/5 또는 M/7 예약 내원, 2026-09-09 M/7 포함)
    --   백내장   : list_cataract_exam.one_day (진료구분 C_원데이·C_노안원데이, V32)
    --   드림렌즈 : 구조상 원데이 불가(M 예약이 있으면 시력교정으로 분류) → 항상 '일반'
    CASE WHEN one_day = 'Y' THEN '원데이' ELSE '일반' END AS exam_type,
    COALESCE(classification, '') AS cataract_class,
    COALESCE(patient_type, '')   AS patient_type,
    -- 소개구분(intro_type) — 2026-10-22 'VIP고객관리팀' 포함 (motive_report 와 정합).
    CASE
        WHEN motive_l IN ('소개고객', '소개미확인', 'VIP고객관리팀') THEN '고객소개'
        WHEN motive_l = '소개직원'                                 THEN '직원소개'
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
