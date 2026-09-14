-- =========================================================
-- 문자 발송 관리 테이블 (V59)
-- Profile: postgres-mart
--
-- 왜 여기 있는가.
--   운영은 ddl-auto: none 이라 JPA 가 표를 만들어 주지 않는다(application-prod.yml).
--   sms_target·sms_send_log 는 엔티티만 있고 생성 스크립트가 없어서 운영에 올리면
--   조회부터 500 이 난다. 마트 스키마 초기화(MartSchemaInitializer)에 실어 함께 생성한다.
--
-- ⚠️ 컬럼은 엔티티(SmsTarget·SmsSendLog)와 **반드시 같은 이름·길이**여야 한다.
--    JPA 기본 네이밍(카멜 → 스네이크)을 그대로 따른다: surgeryDate → surgery_date.
-- ⚠️ 개발(local·dev)은 ddl-auto: update 라 이 스크립트와 JPA 가 함께 표를 본다.
--    IF NOT EXISTS 로 두 경로가 충돌하지 않게 한다.
-- =========================================================

-- 발송 대상 — 수술이 끝난 사람. 마트에서 자동 적재되거나 화면에서 직접 등록된다.
CREATE TABLE IF NOT EXISTS sms_target (
    id            BIGSERIAL     PRIMARY KEY,
    chart_no      VARCHAR(50)   NOT NULL,
    name          VARCHAR(100)  NOT NULL,
    -- 하이픈·공백 없는 01012345678 형식(솔라피 요건). 더미(01000000000)는 발송 불가로 판정한다.
    phone         VARCHAR(20),
    surgery_date  DATE          NOT NULL,
    -- 발송 예정일의 기준일. 보통 수술일과 같고, 연락처 수정·홀딩 해제로 지난 차수를 되살릴 때 밀린다.
    schedule_base DATE,
    surgery_type  VARCHAR(50),
    -- 마트 surgery_op_type() 이 분류한 코드(smilePro·catMulti·reopLens …)
    op_type       VARCHAR(20),
    surgery_r     VARCHAR(100),
    surgery_l     VARCHAR(100),
    -- SENDABLE(발송 대기) / HOLD(발송 홀딩). 구버전 값 CANCELED 도 홀딩으로 취급된다.
    status        VARCHAR(20)   NOT NULL,
    -- AUTO(마트 자동 적재) / MANUAL(사람이 등록·수정). MANUAL 은 자동 적재가 덮지 않는다.
    source        VARCHAR(10)   NOT NULL,
    created_at    TIMESTAMP,
    updated_at    TIMESTAMP
);

-- 기준일 백필 — 컬럼 도입 이전 행은 수술일과 같다. 이걸 채워야 예정일 조회가
-- COALESCE 없이 단순한 파생 쿼리로 돌아간다(리포지토리에 SQL 텍스트를 두지 않기 위해서다).
UPDATE sms_target SET schedule_base = surgery_date WHERE schedule_base IS NULL;

-- 같은 사람·같은 수술일은 한 번만 등록한다(자동 적재의 중복 방지 키).
CREATE UNIQUE INDEX IF NOT EXISTS ux_sms_target_chart_surgery
    ON sms_target (chart_no, surgery_date);
CREATE INDEX IF NOT EXISTS idx_sms_target_surgery_date ON sms_target (surgery_date);
CREATE INDEX IF NOT EXISTS idx_sms_target_status       ON sms_target (status);
-- 발송예정일 기준 조회가 기준일로 훑는다.
CREATE INDEX IF NOT EXISTS idx_sms_target_schedule_base ON sms_target (schedule_base);

-- 발송 이력 — 시도마다 한 줄씩 쌓고 지우지 않는다(재발송도 새 줄).
CREATE TABLE IF NOT EXISTS sms_send_log (
    id                BIGSERIAL     PRIMARY KEY,
    target_id         BIGINT        NOT NULL,
    -- 대상이 지워져도 이력만으로 읽히도록 남기는 스냅샷.
    chart_no          VARCHAR(50),
    name              VARCHAR(100),
    template_code     VARCHAR(20)   NOT NULL,
    template_label    VARCHAR(100),
    -- 요청 채널 ALIMTALK/SMS. 알림톡이 문자로 대체되면 message_type 과 달라진다.
    requested_channel VARCHAR(20)   NOT NULL,
    from_number       VARCHAR(20),
    to_number         VARCHAR(20),
    -- 솔라피 실제 타입(SMS/LMS/ATA …)
    message_type      VARCHAR(20),
    solapi_group_id   VARCHAR(40),
    solapi_message_id VARCHAR(40),
    status_code       VARCHAR(20),
    -- PENDING(접수됨·도달 확인 전) / SUCCESS(단말 도달) / FAILED
    status            VARCHAR(20)   NOT NULL,
    fail_reason       VARCHAR(500),
    delivered_at      TIMESTAMP,
    replacement       BOOLEAN       NOT NULL DEFAULT FALSE,
    -- 발송 시점의 대상 기준일 = **이 발송이 속한 사이클**. 멱등키의 일부다.
    -- 홀딩 해제·연락처 수정으로 기준일이 다시 깔리면 새 사이클이라 재발송이 허용된다.
    cycle_base        DATE,
    sent_at           TIMESTAMP     NOT NULL,
    sent_by           VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_sms_send_log_target  ON sms_send_log (target_id);
CREATE INDEX IF NOT EXISTS idx_sms_send_log_sent_at ON sms_send_log (sent_at);

-- 멱등키 — 같은 사람에게 같은 차수를 같은 사이클에 두 번 보내는 사고를 DB 가 막는다
-- (중복 요청·재시도·동시 호출). 애플리케이션 검사만으로는 동시 요청을 못 막는다.
--
-- 왜 cycle_base 를 넣나: 기준일이 다시 깔리면 새 사이클이므로 **의도된 재발송은 통과**해야 한다.
-- 왜 FAILED 를 빼나: 실패한 시도는 다시 보낼 수 있어야 한다(같은 사이클이라도).
CREATE UNIQUE INDEX IF NOT EXISTS ux_sms_send_log_cycle
    ON sms_send_log (target_id, template_code, cycle_base)
 WHERE status <> 'FAILED';
