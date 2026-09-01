-- =========================================================
-- 문자 발송 큐 테이블 (V62)
-- Profile: postgres-mart
--
-- 왜 여기 있는가.
--   Phase 2 자동 발송 배치(SmsDispatchJob) 의 저장소. Import 시 대상×3차수 = 3행을
--   PENDING 으로 미리 심어두고, 5분 폴러가 scheduled_at 도래분을 뽑아 발송한다.
--   사이클을 사후 로그(sms_send_log)로만 판정하던 것 대비, "언제/왜 안 나갔는지"를
--   표에 남길 수 있고 재시도 상태도 명시적으로 표현된다.
--
-- 상태 라이프사이클: PENDING → PROCESSING → RECEIVED → DONE | FAILED | CANCELED
--   PENDING     발송 대기. scheduled_at 도래하면 폴러가 뽑는다.
--   PROCESSING  폴러가 잡은 상태(FOR UPDATE SKIP LOCKED). 원자적 상태 전이.
--   RECEIVED    솔라피 접수 성공. 웹훅/sync 로 도달 확인 대기 중인 중간 상태.
--   DONE        단말 도달 확인됨(웹훅 SINGLE-REPORT 또는 sync fallback 이 확정).
--   FAILED      max_attempts 도달까지 실패 · 또는 도달 실패 코드. 관리자 재실행 API 로만 되살아남.
--   CANCELED    홀딩·수신거부·번호무효 등 재개 불가 사유로 취소. 재실행 대상 아님.
--
-- 안전장치.
--   - UNIQUE (target_id, template_code, scheduled_at) — 중복 INSERT 방지(재시도·병렬 안전)
--   - 부분 인덱스 (status='PENDING', scheduled_at) — 폴링 O(logN)
--   - target_id 외래키는 안 걸음 — sms_target 은 JPA, 여기는 별도 관리 (delete 안 함)
-- =========================================================

CREATE TABLE IF NOT EXISTS sms_dispatch_queue (
    id            BIGSERIAL     PRIMARY KEY,
    target_id     BIGINT        NOT NULL,
    -- T1 / T2 / T3 (SolapiProperties.templates() 와 같은 값)
    template_code VARCHAR(20)   NOT NULL,
    -- 발송 예정 시각 = target.schedule_base + offsetOf(group, tier) 의 timeOf(tier) 지점
    scheduled_at  TIMESTAMP     NOT NULL,
    -- 발송 시각 편집 시 광고톡 시간대 가드에 쓴다 (NOTIFICATION / AD).
    kind          VARCHAR(20)   NOT NULL,
    -- PENDING(대기) · PROCESSING(폴러 점유) · RECEIVED(솔라피 접수·도달 대기) · DONE(도달) · FAILED(실패) · CANCELED(취소)
    status        VARCHAR(20)   NOT NULL,
    -- 재시도 횟수. sms.dispatch.max-attempts 도달 시 FAILED 로 굳는다.
    attempt_count INT           NOT NULL DEFAULT 0,
    last_error    VARCHAR(500),
    -- 폴러가 PROCESSING 으로 잡은 시각. 진행 중 상태 판정에 씀.
    picked_at     TIMESTAMP,
    -- 최종 처리(DONE/FAILED/CANCELED) 시각.
    processed_at  TIMESTAMP,
    created_at    TIMESTAMP     NOT NULL,
    updated_at    TIMESTAMP
);

-- Import 재실행·오프셋 편집 등으로 같은 (target, tier, 시각) 이 다시 INSERT 되어도
-- 조용히 무시되도록 UNIQUE. scheduled_at 이 다르면 별개 행으로 취급(재조정 시 새 시각).
CREATE UNIQUE INDEX IF NOT EXISTS ux_sms_dispatch_queue_row
    ON sms_dispatch_queue (target_id, template_code, scheduled_at);

-- 폴러가 매 5분 훑는 조건 → 부분 인덱스로 스캔량 최소화.
CREATE INDEX IF NOT EXISTS idx_sms_dispatch_queue_pending
    ON sms_dispatch_queue (scheduled_at)
    WHERE status = 'PENDING';

-- target 삭제·홀딩 시 그 대상의 큐 행을 찾아 취소할 때 쓴다.
CREATE INDEX IF NOT EXISTS idx_sms_dispatch_queue_target
    ON sms_dispatch_queue (target_id);

-- 오늘 처리량 카운트(sms.dispatch.daily-limit) 조회용.
-- 옛 인덱스(DONE 만) 는 후위 호환으로 유지. 신규는 아래 sent_processed 를 쓴다.
CREATE INDEX IF NOT EXISTS idx_sms_dispatch_queue_processed_at
    ON sms_dispatch_queue (processed_at)
    WHERE status = 'DONE';

-- daily-limit 은 "오늘 솔라피에 넘긴 건수" = RECEIVED + DONE 합계로 세므로
-- 두 상태를 함께 훑는 부분 인덱스를 별도로 둔다.
CREATE INDEX IF NOT EXISTS idx_sms_dispatch_queue_sent_processed
    ON sms_dispatch_queue (processed_at)
    WHERE status IN ('RECEIVED', 'DONE');
