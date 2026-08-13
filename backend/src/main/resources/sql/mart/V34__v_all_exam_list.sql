-- =========================================================
-- 전체 검사자 뷰 (V34) — list_exam + list_cataract_exam 의 단일 정의
-- Profile: postgres-mart
--
-- 왜 뷰인가.
--   검사구분·원데이·유입·직업·백내장분류 같은 파생값이 종전에는
--   select-all-exam-list.sql(리스트 화면) 안에만 있었다. 레포트는 MSSQL 에서
--   같은 규칙을 따로 구현해서, 정의가 바뀌면 여러 곳을 찾아 고쳐야 했고
--   하나 빠뜨리면 조용히 어긋났다(2026-08-05 원데이 3건).
--   뷰로 승격해 리스트·월별·주차가 **같은 정의 하나**를 보게 한다.
--
-- 저장하지 않는다 — 원본 행은 이미 list_exam / list_cataract_exam 에 쌓여 있고
-- 이 뷰는 그 위의 파생 규칙일 뿐이다. 새 표도 새 배치도 없다.
--
-- ⚠️ 파생 규칙을 바꾸면 여기만 고친다. 리스트·레포트가 함께 따라온다.
-- ⚠️ 뷰에는 2026-01 이후 행만 있다(그 전은 마트에 리스트가 없다).
--    2024·2025 와 2026-01~05 레포트 값은 골든 시드가 우선이라 이 뷰와 무관하다.
--
-- ⚠️ 재기동 idempotency — MartSchemaInitializer 가 매 부팅마다 스크립트를 재실행한다.
--    V52 가 이 뷰에 컬럼을 추가한 이후에는 V34 의 CREATE OR REPLACE 로는 컬럼 축소가
--    안 돼 재기동이 터진다. 그래서 DROP + CREATE 패턴을 쓴다(V48·V50 과 동일).
-- =========================================================

DROP VIEW IF EXISTS v_all_exam_list CASCADE;
CREATE VIEW v_all_exam_list AS
WITH src AS (
    SELECT exam_date, chart_no, name, exam_category, patient_type,
           motive_l, motive_m, motive_s, job, grade, birth,
           phone1, phone2, email, counselor, doctor, optometrist,
           last_visit, memo, one_day, '' AS classification
      FROM list_exam
    UNION ALL
    -- classification: 백내장 리스트의 분류(백내장/중단/노안·FU/기타, V23)
    SELECT exam_date, chart_no, name, exam_category, patient_type,
           motive_l, motive_m, motive_s, job, grade, birth,
           phone1, phone2, email, counselor, doctor, optometrist,
           last_visit, memo, one_day, classification
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
    COALESCE(memo, '')           AS memo
  FROM src;
