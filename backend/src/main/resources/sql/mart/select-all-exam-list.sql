-- 전체 검사자 리스트 — list_exam + list_cataract_exam UNION.
-- MSSQL 직결 find-all-exam-list.sql 을 마트 기반으로 이관.
--
-- 원본 파생 필드는 mart 원시 컬럼(motive_l, job)에서 CASE로 재분류:
--   introType  : 소개고객/소개미확인→고객소개, 소개직원→직원소개, 그외→일반
--   jobBucket  : find-all-exam-list.sql 의 CASE 를 Postgres 문법(SIMILAR TO)으로 이식
--                MSSQL의 [0-9] 문자 클래스는 Postgres LIKE 미지원 → SIMILAR TO 로 대체
--
-- 필터(테스트고객·백내장 스텁 제외)는 mart 적재 시(find-exam-list.sql / find-cataract-exam-list.sql)
-- 이미 적용됐으므로 여기서 재적용하지 않음.
--
-- patient_type 은 mart 적재 시점의 계산값(사람의 첫 방문일 기준)을 그대로 사용.
-- MSSQL 직결 판정(FIRST_DAY within 요청 range) 과는 미세 차이 있으나 per-row 안정적이라
-- exam-list / cataract-exam-list 페이지와 정합.

WITH src AS (
    SELECT exam_date, chart_no, name, exam_category, patient_type,
           motive_l, motive_m, motive_s, job, grade, birth,
           phone1, phone2, email, counselor, doctor, optometrist,
           last_visit, memo
      FROM list_exam
     WHERE exam_date >= CAST(:from AS DATE)
       AND exam_date <= CAST(:to   AS DATE)
    UNION ALL
    SELECT exam_date, chart_no, name, exam_category, patient_type,
           motive_l, motive_m, motive_s, job, grade, birth,
           phone1, phone2, email, counselor, doctor, optometrist,
           last_visit, memo
      FROM list_cataract_exam
     WHERE exam_date >= CAST(:from AS DATE)
       AND exam_date <= CAST(:to   AS DATE)
)
SELECT
    COALESCE(chart_no, '')                     AS "chartNo",
    COALESCE(name, '')                         AS "name",
    TO_CHAR(exam_date, 'YYYY-MM-DD')           AS "examDate",
    COALESCE(exam_category, '')                AS "examGroup",
    COALESCE(patient_type, '')                 AS "patientType",
    CASE
        WHEN motive_l IN ('소개고객', '소개미확인') THEN '고객소개'
        WHEN motive_l = '소개직원'                  THEN '직원소개'
        ELSE '일반'
    END                                         AS "introType",
    COALESCE(motive_l, '')                      AS "motiveL",
    COALESCE(motive_m, '')                      AS "motiveM",
    COALESCE(motive_s, '')                      AS "motiveS",
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
    END                                         AS "jobBucket",
    COALESCE(job, '')                           AS "job",
    COALESCE(grade, '')                         AS "grade",
    COALESCE(birth, '')                         AS "birth",
    COALESCE(phone2, '')                        AS "phone2",
    COALESCE(phone1, '')                        AS "phone1",
    COALESCE(email, '')                         AS "email",
    COALESCE(counselor, '')                     AS "counselor",
    COALESCE(doctor, '')                        AS "doctor",
    COALESCE(optometrist, '')                   AS "optometrist",
    COALESCE(last_visit, '')                    AS "lastVisit",
    COALESCE(memo, '')                          AS "memo"
  FROM src
 ORDER BY exam_date,
          CASE WHEN exam_category = '백내장' THEN 1 ELSE 0 END,
          name
