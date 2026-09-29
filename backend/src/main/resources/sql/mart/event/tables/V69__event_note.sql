-- =========================================================
-- 이벤트 노트 (V69)
-- Profile: postgres-mart
--
-- 왜 필요한가.
--   특정 시점에 발생한 이벤트(프로모션·광고 집행·휴진·장애 등)를 날짜와 함께 남겨,
--   통계 차트 위에 마커로 겹쳐 "이 날 왜 튀었나"를 설명하려고 둔다.
--   배치 적재가 아니라 화면에서 사람이 입력하는 원천 데이터라 JPA 엔티티(event/entity/EventNote)로 CRUD 한다.
--
-- 왜 DDL 을 따로 두나.
--   운영(prod)은 ddl-auto: none 이라 Hibernate 가 표를 만들지 않는다. 이 파일이 없으면 운영에서 500.
--   컬럼 정의는 EventNote + BaseEntity 와 반드시 같게 맞춘다.
--
-- 규칙.
--   - 조회는 event_date 하나로만 한다 (from ≤ event_date ≤ to). start_date/end_date 는 차트 구간 표시용.
--   - 삭제는 소프트 삭제(delete_flag). JPA @SQLRestriction 이 조회에서 뺀다.
--   - created_*/updated_* 는 JPA Auditing 이 채운다 — DB DEFAULT now() 를 두지 않는다
--     (DB 서버 타임존에 흔들리지 않게. docs/event-note/design.md §3-4).
-- =========================================================

CREATE TABLE IF NOT EXISTS event_note (
    id           BIGSERIAL    PRIMARY KEY,
    event_date   DATE         NOT NULL,
    summary      VARCHAR(100) NOT NULL,
    description  TEXT,
    start_date   DATE,
    end_date     DATE,
    delete_flag  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by   VARCHAR(50)  NOT NULL,
    created_at   TIMESTAMP    NOT NULL,
    updated_by   VARCHAR(50)  NOT NULL,
    updated_at   TIMESTAMP    NOT NULL,
    -- 기간형 이벤트면 시작일 ≤ 발생일 ≤ 종료일 (요청 DTO 검증과 같은 규칙)
    CONSTRAINT event_note_period_ck CHECK (
        (start_date IS NULL OR start_date <= event_date) AND
        (end_date   IS NULL OR event_date <= end_date)
    )
);

-- 이름은 엔티티 @Index 와 같게 둔다 — ddl-auto=update(local·dev) 가 같은 인덱스를 한 번 더 만들지 않도록.
CREATE INDEX IF NOT EXISTS idx_event_note_event_date ON event_note (event_date);

COMMENT ON TABLE  event_note             IS '이벤트 노트 — 특정 시점 이벤트 기록 (차트 오버레이용, 화면 입력 원천 데이터)';
COMMENT ON COLUMN event_note.event_date  IS '이벤트 발생일 — 조회 기준이자 차트 마커 위치';
COMMENT ON COLUMN event_note.summary     IS '요약 (차트 툴팁·목록 제목, 최대 100자)';
COMMENT ON COLUMN event_note.description IS '내용';
COMMENT ON COLUMN event_note.start_date  IS '기간형 이벤트 시작일 (선택, 차트 구간 표시용)';
COMMENT ON COLUMN event_note.end_date    IS '기간형 이벤트 종료일 (선택, 차트 구간 표시용)';
COMMENT ON COLUMN event_note.delete_flag IS '소프트 삭제 여부';
COMMENT ON COLUMN event_note.created_by  IS '작성자 로그인 ID (JPA Auditing, 로그인 없으면 system)';
COMMENT ON COLUMN event_note.updated_by  IS '최종 수정자 로그인 ID (JPA Auditing)';
