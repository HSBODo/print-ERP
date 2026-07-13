-- =========================================================
-- batch_run_log 테이블별 upsert 통계 컬럼 추가 (V17)
-- Profile: postgres-mart
--
-- 기존: rows_upserted (총합 1개) 만 저장. 어느 테이블에 몇 건 썼는지는 콘솔 로그로만 확인 가능.
-- 신규: table_stats JSONB — {"mart_surgery_monthly": 12, "mart_surgery_daily": 30, ...}
--       각 잡이 완료 시 자신이 write 한 테이블별 rows_upserted 를 JSON 으로 저장.
--
-- Admin API (GET /api/admin/batch/run-logs) 응답에 자동 포함되어 관리자 화면에서
-- 배치 이력 조회 시 테이블별 처리 건수를 즉시 확인 가능.
--
-- 마이그레이션 후 예전 이력의 table_stats 는 NULL (호환).
-- =========================================================

ALTER TABLE batch_run_log
    ADD COLUMN IF NOT EXISTS table_stats JSONB;
