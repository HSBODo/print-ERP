-- =========================================================
-- 24·25 레거시 값 seed (V9) — PR-17
-- Profile: postgres-mart
--
-- 완전 커버 마트만 초기 데이터 삽입 (INSERT ... ON CONFLICT DO NOTHING):
--   - mart_procedure_exam_monthly     : exam_count + one_day_exam_count (전 컬럼 LEGACY 커버)
--   - mart_outpatient_count_monthly   : outpatient_count + total (LEGACY 커버)
--
-- 이미 배치가 채운 행은 건드리지 않는다(ON CONFLICT DO NOTHING). 신규 환경에서 배치 없이도
-- API 조회가 가능하도록 안전망 역할. 값 수정은 배치 이후 UPDATE 로 처리한다.
--
-- 부분 커버 마트(mart_examination_monthly, mart_surgery_monthly 등)는 dreamlens/lasek 등
-- 라이브 컬럼이 있어 SQL seed 로 완전한 행을 만들 수 없음 → 관리자 수동 배치(runManual)로 backfill.
--
-- 값 원천 (Java 상수와 동기화 유지):
--   - ProcedureExamStatsService.LEGACY_EXAM_COUNT
--   - ProcedureExamStatsService.LEGACY_ONE_DAY_EXAM_COUNT
--   - OutpatientCountStatsService.LEGACY_OUTPATIENT_COUNT
-- =========================================================

-- ─── mart_procedure_exam_monthly (2024·2025) ─────────────
-- total = examCount (ProcedureExamStatsService 서비스 계약)
INSERT INTO mart_procedure_exam_monthly (yr, mo, exam_count, one_day_exam_count, total) VALUES
    -- 2024
    (2024,  1, 2432, 1127, 2432),
    (2024,  2, 2035, 1100, 2035),
    (2024,  3, 1286,  573, 1286),
    (2024,  4, 1140,  476, 1140),
    (2024,  5, 1380,  640, 1380),
    (2024,  6, 1388,  645, 1388),
    (2024,  7, 1674,  744, 1674),
    (2024,  8, 1728,  782, 1728),
    (2024,  9, 1324,  699, 1324),
    (2024, 10, 1258,  620, 1258),
    (2024, 11, 1568,  697, 1568),
    (2024, 12, 2234, 1097, 2234),
    -- 2025
    (2025,  1, 2436, 1460, 2436),
    (2025,  2, 2114, 1182, 2114),
    (2025,  3, 1177,  616, 1177),
    (2025,  4, 1124,  533, 1124),
    (2025,  5, 1256,  627, 1256),
    (2025,  6, 1132,  519, 1132),
    (2025,  7, 1291,  577, 1291),
    (2025,  8, 1337,  604, 1337),
    (2025,  9, 1190,  459, 1190),
    (2025, 10, 1357,  867, 1357),
    (2025, 11, 1085,  495, 1085),
    (2025, 12, 1860,  785, 1860)
ON CONFLICT (yr, mo) DO NOTHING;


-- ─── mart_outpatient_count_monthly (2024·2025) ────────────
-- total = outpatientCount (OutpatientCountStatsService 서비스 계약)
INSERT INTO mart_outpatient_count_monthly (yr, mo, outpatient_count, total) VALUES
    -- 2024
    (2024,  1, 5257, 5257),
    (2024,  2, 5080, 5080),
    (2024,  3, 4721, 4721),
    (2024,  4, 4133, 4133),
    (2024,  5, 4159, 4159),
    (2024,  6, 4092, 4092),
    (2024,  7, 4760, 4760),
    (2024,  8, 4720, 4720),
    (2024,  9, 3696, 3696),
    (2024, 10, 4201, 4201),
    (2024, 11, 3948, 3948),
    (2024, 12, 4711, 4711),
    -- 2025
    (2025,  1, 5389, 5389),
    (2025,  2, 5389, 5389),
    (2025,  3, 4933, 4933),
    (2025,  4, 4349, 4349),
    (2025,  5, 4451, 4451),
    (2025,  6, 4000, 4000),
    (2025,  7, 4275, 4275),
    (2025,  8, 4354, 4354),
    (2025,  9, 3332, 3332),
    (2025, 10, 3724, 3724),
    (2025, 11, 3639, 3639),
    (2025, 12, 4086, 4086)
ON CONFLICT (yr, mo) DO NOTHING;
