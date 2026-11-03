-- 전체 검사자 리스트 — v_all_exam_list 조회.
--
-- 2026-08-05: UNION + 파생 CASE 를 뷰(V34)로 승격했다. 종전에는 그 로직이 이 파일 안에만
-- 있어서, 레포트가 MSSQL 에서 같은 규칙을 따로 구현했고 정의가 어긋나기 쉬웠다.
-- 이제 리스트·월별·주차가 같은 뷰를 본다 — 파생 규칙은 V34 한 곳에서만 고친다.
--
-- 필터(테스트고객·백내장 스텁 제외)는 마트 적재 시(select-exam-list.sql /
-- select-cataract-exam-list.sql) 이미 적용됐으므로 여기서 재적용하지 않는다.
--
-- patient_type 은 마트 적재 시점의 계산값(사람의 첫 방문일 기준)을 그대로 쓴다.

SELECT
    chart_no                         AS "chartNo",
    name                             AS "name",
    TO_CHAR(exam_date, 'YYYY-MM-DD') AS "examDate",
    -- 수술 예약일 — "검사 → 수술예약" 흐름을 한 행에서 확인할 수 있게 노출.
    -- 뷰 V56 가 list_exam/list_cataract_exam 양쪽에서 가져온 값을 '' 로 정규화해 둠.
    -- 수술 실시일(surgery_date) 은 환자 과거 수술 이력이 섞여(백내장 1차→경과검사→2차 패턴)
    -- 시간 순서가 뒤집히는 혼란을 유발하므로 노출하지 않는다. 필요 시 조인 조건에
    -- `OPERATION_DATE >= EXAM_DATE` 를 걸어 "이 검사 이후 수술만" 매칭 후 재검토.
    surgery_reserve_date             AS "surgeryReserveDate",
    exam_group                       AS "examGroup",
    exam_type                        AS "examType",
    cataract_class                   AS "cataractClass",
    patient_type                     AS "patientType",
    intro_type                       AS "introType",
    motive_report                    AS "motiveReport",
    motive_l                         AS "motiveL",
    motive_m                         AS "motiveM",
    motive_s                         AS "motiveS",
    job_bucket                       AS "jobBucket",
    job                              AS "job",
    grade                            AS "grade",
    birth                            AS "birth",
    phone2                           AS "phone2",
    phone1                           AS "phone1",
    email                            AS "email",
    counselor                        AS "counselor",
    doctor                           AS "doctor",
    optometrist                      AS "optometrist",
    last_visit                       AS "lastVisit",
    memo                             AS "memo"
  FROM v_all_exam_list
 WHERE exam_date >= CAST(:from AS DATE)
   AND exam_date <= CAST(:to   AS DATE)
 ORDER BY exam_date,
          CASE WHEN exam_group = '백내장' THEN 1 ELSE 0 END,
          name
