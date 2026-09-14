-- =========================================================
-- 재수술 리스트 마트 (V36)
-- Profile: postgres-mart
--
-- 왜 만드는가.
--   재수술은 RE_OPERATION 별도 테이블이라 list_surgery 에 들어있지 않았다.
--   수술자 리스트 화면은 프론트에서 두 API 결과를 합쳐 보여주고 있었는데
--   (SurgeryListPage: useSurgeryList + useReoperationCandidates),
--   그러면 DB 쪽에 "전체 수술"을 정의하는 자리가 없어 뷰를 만들 수 없다.
--   v_all_surgery_list 가 시력교정·백내장·재수술을 한 정의로 묶으려면
--   재수술도 마트에 있어야 한다.
--
-- 저장 판정은 여기 넣지 않는다.
--   포함/제외 최종 판정은 reoperation_decision(JPA 테이블) 이 갖고 있고,
--   화면에서 언제든 바뀐다. 마트에 굳혀두면 판정을 고쳐도 배치 전까지 반영이 안 된다.
--   → 뷰가 조회 시점에 LEFT JOIN 으로 얹는다(auto_included 는 기본값 역할).
--   ⚠️ reoperation_decision 의 실제 컬럼명은 again_r/again_l 이 아니라 againr/againl 이다.
--
-- is_lens 는 적재 시점에 자바(ReoperationOverlay.LENS_PATTERNS)가 계산해 넣는다.
--   시술명 패턴을 SQL 로 옮기면 자바와 두 벌이 되어, 방금 KPL 누락으로 겪은
--   "한쪽만 고쳐서 어긋나는" 문제가 되살아난다. 패턴의 SSOT 는 자바 한 곳으로 유지.
-- =========================================================

CREATE TABLE IF NOT EXISTS list_reoperation (
    id            BIGSERIAL     PRIMARY KEY,
    reop_date     DATE          NOT NULL,
    chart_no      VARCHAR(50)   NOT NULL,
    name          VARCHAR(100),
    name_eng      VARCHAR(100),
    patient_type  VARCHAR(10),              -- '신환' | '구환'
    surgeon       VARCHAR(100),
    payment       VARCHAR(50),
    again_r       VARCHAR(200)  NOT NULL DEFAULT '',
    again_l       VARCHAR(200)  NOT NULL DEFAULT '',
    reason_cd     VARCHAR(10),
    -- 자동판정(1=집계 포함). 저장 판정이 없을 때의 기본값.
    auto_included SMALLINT      NOT NULL DEFAULT 0,
    exclude_reason VARCHAR(100),
    -- 렌즈/레이저 — 자바 ReoperationOverlay.isLensCategory() 결과
    is_lens       BOOLEAN       NOT NULL DEFAULT FALSE,
    loaded_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_reoperation_date
    ON list_reoperation (reop_date);

-- 뷰가 reoperation_decision 과 (chart_no, reop_date, again_r, again_l) 로 조인한다.
CREATE INDEX IF NOT EXISTS idx_list_reoperation_key
    ON list_reoperation (chart_no, reop_date, again_r, again_l);
