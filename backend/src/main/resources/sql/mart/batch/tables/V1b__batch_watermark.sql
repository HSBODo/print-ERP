-- =========================================================
-- 마트별 워터마크 (V1b)
-- Profile: postgres-mart
--
-- 마지막으로 성공적으로 적재된 날짜. 다음 daily append 실행 시
-- 이 값 + 1일 ~ 어제까지의 데이터를 가져온다.
-- 최초 실행 시 워터마크가 없으면 잡의 기본 시작일(코드에 정의)을 사용.
-- =========================================================

CREATE TABLE IF NOT EXISTS batch_watermark (
    mart_name       VARCHAR(100)    PRIMARY KEY,
    last_loaded_at  DATE            NOT NULL,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
