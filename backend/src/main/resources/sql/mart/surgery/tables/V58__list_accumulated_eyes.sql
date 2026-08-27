-- =========================================================
-- 누적 안수 리스트 마트 (V58)
-- Profile: postgres-mart
--
-- 원천: MSSQL OPERATION_ACCUMULATED_EYE_COUNT (한 사람 양안이면 R/L 각 1행 · 눈 단위)
-- 화면: 수술 그룹 하위 "누적 안수" — 기간 리스트 + 이름/차트/전화 검색.
--
-- PK 를 원천 UUID(id) 로 잡은 이유:
--   한 사람의 한 수술일에 R/L 각 1행이 오므로 (chart_no, surgery_date, eye_position) 도
--   후보이지만, 소급 변동 시 EYE_POSITION 이 바뀌거나 재발급될 수 있어 원천 PK 를 그대로 쓴다.
--   → 재적재는 range delete + insert 방식이지만, 혹시 소급 밖에서 같은 id 가 들어와도
--     PK 위반으로 즉시 드러난다(조용한 중복 방지).
--
-- 재적재 규약:
--   BatchOrchestrator 가 넘긴 from..to 범위 안의 operation_date 를 delete → 재조회 insert.
--   소급 30일은 매월 1일 03:30 monthly-reconcile 이 흡수(다른 리스트 마트와 동형).
--
-- is_active 처리:
--   원천에서 false 로 바뀐 행도 그대로 담고, 화면 SELECT 에서 기본 필터한다.
--   (마트에서 제외해버리면 monthly-reconcile 이 delete 하지 못하는 케이스가 생긴다.)
-- =========================================================

CREATE TABLE IF NOT EXISTS list_accumulated_eyes (
    id                    VARCHAR(40)  PRIMARY KEY,
    cust_num              BIGINT       NOT NULL,
    custom_name           VARCHAR(100),
    custom_phone          VARCHAR(20),
    operation_category    VARCHAR(50),
    operation_code        VARCHAR(200),
    operation_date        DATE         NOT NULL,
    accumulated_eye_count BIGINT       NOT NULL,
    eye_position          CHAR(1),                                  -- 'R' | 'L'
    create_date           TIMESTAMP,
    last_modified_date    TIMESTAMP,
    is_active             BOOLEAN      NOT NULL,
    loaded_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_accumulated_eyes_operation_date
    ON list_accumulated_eyes (operation_date);

CREATE INDEX IF NOT EXISTS idx_list_accumulated_eyes_cust_num
    ON list_accumulated_eyes (cust_num);

-- 안수 정확 조회(예: query='627122') 시 B-tree hit. 정렬(operation_date, accumulated_eye_count)에서도
-- 두번째 키로 활용되어 소량이지만 tie-break 정렬 비용도 줄어든다.
CREATE INDEX IF NOT EXISTS idx_list_accumulated_eyes_eye_count
    ON list_accumulated_eyes (accumulated_eye_count);

-- monthly-reconcile 이 last_modified_date 로 소급 흡수 시 이 인덱스 사용 여지.
CREATE INDEX IF NOT EXISTS idx_list_accumulated_eyes_last_modified
    ON list_accumulated_eyes (last_modified_date);
