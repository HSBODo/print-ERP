-- =========================================================
-- 문자 발송 설정 — 그룹별 오프셋 + 차수별 발송 시각·메시지 종류 (V61)
-- Profile: postgres-mart
--
-- 왜 여기 있는가.
--   지금까지 오프셋은 SurgeryGroup.java 안의 컴파일 타임 상수라 값 변경에 재빌드가 필요했다.
--   운영이 브라우저에서 그리드로 편집할 수 있도록 DB 로 옮긴다. Java 상수는 안전망(fallback)으로
--   남겨 이 표가 비어도 지금과 같은 값으로 동작한다.
--
-- 편집 대상 그룹은 발송 대상 4종(SMILE·LASIK·LASEK·ICL)만.
--   ETC(백내장·재수술·프레스비욘드·미분류)는 select-surgery-targets.sql 이 이미 걸러
--   sms_target 에 담기지 않으므로 오프셋 편집 대상이 아니다.
--
-- 발송 시각·메시지 종류는 tier-level (1·2·3차) 이라 4행 모두 같은 값을 유지한다.
--   서비스가 편집 시 4행을 원자적으로 같은 값으로 갱신한다 — 컬럼 위치는 오프셋과 같은 표에
--   얹지만 의미상 tier-level 이므로 UI 는 한 벌만 노출한다.
--
-- 메시지 종류(kind) 별 시간 제한 :
--   'NOTIFICATION' 알림톡 — 정보성 메시지. 시간 제한 없음(기본값 · 수술 후 안내)
--   'AD'           광고톡 — 광고성 메시지. 정보통신망법상 21~08 발송 금지 → 서비스가 hour 8..20 강제
--   유효성은 서비스가 kind 따라 분기 검사한다(스키마 CHECK 는 재기동 안전 위해 두지 않음).
--
-- ⚠️ 재기동 idempotency 3중 방어:
--   1) CREATE TABLE IF NOT EXISTS — 신규 DB 에 완성 스키마 한 번에 생성
--   2) ALTER TABLE ADD COLUMN IF NOT EXISTS — 이전 부팅에서 다른 컬럼 조합으로 만들어진 스키마
--      (공용 개발 DB 특성상 발생) 를 catch-up. postgres 9.6+ 필수 문법.
--   3) INSERT ON CONFLICT DO NOTHING — 운영자가 UI 로 편집한 값 보존
-- =========================================================

CREATE TABLE IF NOT EXISTS sms_offset_config (
    -- SurgeryGroup 의 code 와 정확히 일치(대문자). Java 상수를 그대로 씀.
    group_code    VARCHAR(20) PRIMARY KEY,
    tier1_offset  INT         NOT NULL DEFAULT 1,
    tier2_offset  INT         NOT NULL DEFAULT 7,
    tier3_offset  INT         NOT NULL DEFAULT 14,
    tier1_time    TIME        NOT NULL DEFAULT '10:00',
    tier2_time    TIME        NOT NULL DEFAULT '10:00',
    tier3_time    TIME        NOT NULL DEFAULT '10:00',
    tier1_kind    VARCHAR(20) NOT NULL DEFAULT 'NOTIFICATION',
    tier2_kind    VARCHAR(20) NOT NULL DEFAULT 'NOTIFICATION',
    tier3_kind    VARCHAR(20) NOT NULL DEFAULT 'NOTIFICATION',
    updated_by    VARCHAR(50),
    updated_at    TIMESTAMP
);

-- 이전 부팅에서 컬럼이 빠진 상태로 만들어진 sms_offset_config 에도 안전하게 컬럼을 추가한다.
-- 새 DB 에는 no-op. DEFAULT 값이 있어야 기존 행에도 NOT NULL 을 채울 수 있다.
ALTER TABLE sms_offset_config ADD COLUMN IF NOT EXISTS tier1_offset INT NOT NULL DEFAULT 1;
ALTER TABLE sms_offset_config ADD COLUMN IF NOT EXISTS tier2_offset INT NOT NULL DEFAULT 7;
ALTER TABLE sms_offset_config ADD COLUMN IF NOT EXISTS tier3_offset INT NOT NULL DEFAULT 14;
ALTER TABLE sms_offset_config ADD COLUMN IF NOT EXISTS tier1_time   TIME NOT NULL DEFAULT '10:00';
ALTER TABLE sms_offset_config ADD COLUMN IF NOT EXISTS tier2_time   TIME NOT NULL DEFAULT '10:00';
ALTER TABLE sms_offset_config ADD COLUMN IF NOT EXISTS tier3_time   TIME NOT NULL DEFAULT '10:00';
ALTER TABLE sms_offset_config ADD COLUMN IF NOT EXISTS tier1_kind   VARCHAR(20) NOT NULL DEFAULT 'NOTIFICATION';
ALTER TABLE sms_offset_config ADD COLUMN IF NOT EXISTS tier2_kind   VARCHAR(20) NOT NULL DEFAULT 'NOTIFICATION';
ALTER TABLE sms_offset_config ADD COLUMN IF NOT EXISTS tier3_kind   VARCHAR(20) NOT NULL DEFAULT 'NOTIFICATION';
ALTER TABLE sms_offset_config ADD COLUMN IF NOT EXISTS updated_by   VARCHAR(50);
ALTER TABLE sms_offset_config ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP;

-- TF 확정안 v5 기본값 (2026-07-27). 이미 값이 있는 그룹은 건드리지 않는다(관리자 편집분 보존).
-- ⚠️ 모든 컬럼을 명시적으로 지정 — 기존 DB 에 컬럼이 있어도 DEFAULT 가 안 붙어 있을 수 있어서다
--    (ALTER TABLE ADD COLUMN IF NOT EXISTS 는 이미 있는 컬럼에 DEFAULT 를 재적용하지 않는다).
INSERT INTO sms_offset_config (
    group_code,
    tier1_offset, tier2_offset, tier3_offset,
    tier1_time, tier2_time, tier3_time,
    tier1_kind, tier2_kind, tier3_kind,
    updated_by, updated_at
) VALUES
    ('SMILE', 1, 7, 14, '10:00', '10:00', '10:00', 'NOTIFICATION', 'NOTIFICATION', 'NOTIFICATION', 'system', CURRENT_TIMESTAMP),
    ('LASIK', 1, 7, 14, '10:00', '10:00', '10:00', 'NOTIFICATION', 'NOTIFICATION', 'NOTIFICATION', 'system', CURRENT_TIMESTAMP),
    ('LASEK', 5, 7, 14, '10:00', '10:00', '10:00', 'NOTIFICATION', 'NOTIFICATION', 'NOTIFICATION', 'system', CURRENT_TIMESTAMP),
    ('ICL',   3, 7, 14, '10:00', '10:00', '10:00', 'NOTIFICATION', 'NOTIFICATION', 'NOTIFICATION', 'system', CURRENT_TIMESTAMP)
ON CONFLICT (group_code) DO NOTHING;
