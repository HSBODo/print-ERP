-- =========================================================
-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/exam/select-onedays-with-later-reexam.sql
-- 이관 이력: 2026-09-30 A5-3 (ExamMartJob 배치 read-side, dual JdbcTemplate 특수:
--   CRM 읽기(warehouseJdbcTemplate) + mart UPDATE(martJdbcTemplate)).
--
-- 방언 변환:
--   EXAM → raw.raw_crm_exam
--   RESERVATION → raw.raw_crm_reservation
--   ISNULL → COALESCE
--   CONVERT(varchar(10), e.EXAM_DATE, 23) → SUBSTRING(e.exam_date FROM 1 FOR 10)
--     (raw.raw_crm_exam.exam_date 가 이미 varchar 라 CAST 불필요, 앞 10자만 잘라 안전)
--   WITH(NOLOCK) → 제거
-- =========================================================

SELECT DISTINCT
       COALESCE(LTRIM(RTRIM(e.cust_num)), '')       AS "chartNo",
       SUBSTRING(e.exam_date FROM 1 FOR 10)          AS "examDate"
FROM   raw.raw_crm_exam e
WHERE  e.exam_date >= :from AND e.exam_date <= :to
  AND  EXISTS (
         SELECT 1
         FROM   raw.raw_crm_reservation r
         WHERE  r.cust_num       = e.cust_num
           AND  r.reserve_flag   = 'M'
           AND  r.reserve_jinryo = '2'
           AND  r.reserve_date   > e.exam_date
       );
