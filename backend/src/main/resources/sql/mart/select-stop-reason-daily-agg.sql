-- 중단 사유 일별 집계 — v_all_exam_list(= 전체 검사자 리스트) 하나에서 뽑는다.
--
-- 월별 레포트·중단 사유 화면이 **모두 이 결과를 합산**해서 쓴다.
-- 종전에는 같은 지표를 MSSQL 쪽 쿼리(select-stop-reason-monthly.sql)가 계산해
-- 정의가 어긋날 위험이 있었다. 검사·수술·외래수 도메인이 먼저 같은 패턴으로 이관됐고
-- (ExamMartJob.java:65-69 주석 참조), 중단 사유도 동일 방식.
--
-- 일(day) 단위로 주는 이유 — 월별은 월로, 주차는 ISO 주차로 각자 접으면 되고
-- 두 축이 같은 행에서 나오므로 서로 어긋날 수 없다.
--
-- ⚠️ 리스트가 있는 구간(2026-01~)만 값이 나온다. 2024·2025 와 2026-01~05 는
--    골든 시드 대상이 아니라 그대로 계산된다(mart_stop_reason_monthly 는 시드 없음).
-- ⚠️ 시력교정(EXAM) 중단자만 대상 — 원본 정의와 동일. 백내장은 v_all_exam_list 에서
--    stop_reason_bucket = '' 로 남아 자연히 제외된다.
--
-- ⚠️ 원본 대사(reconcile) 와의 정합에 대해.
--    원본 SQL(sql/softcrm/consultation/select-stop-reason-monthly.sql) 은 raw EXAM 테이블을 조회해
--    STOP_YN='Y' 만 걸어 셈. 이 SQL 은 list_exam 을 거치므로 select-exam-list.sql 의 필터가 이미
--    적용된 population 을 본다. 그 필터 4개(테스트 이름 · pure cataract empty measurements ·
--    순수 외래 유입 제외 · 백내장 중복 제거)만큼 mart 가 원본보다 적게 셈.
--    이 diff (월 최대 4건 수준) 는 리스트 정의가 화면 검사자 리스트와 정확히 정합하도록 하는
--    설계상의 정상 상태이지 버그가 아니다(2026-08-12 결정). 원본 raw EXAM 은 테스트·외래유입·
--    백내장 중복 등을 포함해 노이즈가 섞여 있다.
--
-- 컬럼 뜻 (7버킷 alias 는 camelCase — 리포지토리 매핑과 일치):
--   recommendX     불가-수술권유X      121 · 305
--   lensImpossible 불가-렌즈삽입불가   122 · 306 · 399
--   keratoconus    불가-원추각막       124 · 125 · 308 · 309
--   avellino       불가-아벨리노       126 · 310
--   glaucoma       불가-녹내장         114 · 303
--   visionChange   불가-시력변화       111 · 302
--   other          기타(잠정 중단)     107 · 199 · 117 · 304 · 127 · 311 + 미지 코드
SELECT
    exam_date AS d,
    COUNT(*) FILTER (WHERE stop_reason_bucket = 'recommendX')      AS "recommendX",
    COUNT(*) FILTER (WHERE stop_reason_bucket = 'lensImpossible')  AS "lensImpossible",
    COUNT(*) FILTER (WHERE stop_reason_bucket = 'keratoconus')     AS keratoconus,
    COUNT(*) FILTER (WHERE stop_reason_bucket = 'avellino')        AS avellino,
    COUNT(*) FILTER (WHERE stop_reason_bucket = 'glaucoma')        AS glaucoma,
    COUNT(*) FILTER (WHERE stop_reason_bucket = 'visionChange')    AS "visionChange",
    COUNT(*) FILTER (WHERE stop_reason_bucket = 'other')           AS other
  FROM v_all_exam_list
 WHERE exam_date >= CAST(:from AS DATE)
   AND exam_date <= CAST(:to   AS DATE)
   AND stop_reason_bucket <> ''
 GROUP BY exam_date
 ORDER BY exam_date
