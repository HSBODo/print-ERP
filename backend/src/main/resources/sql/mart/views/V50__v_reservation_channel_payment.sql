-- =========================================================
-- v_reservation_channel — 예약자 리스트 위의 채널 파생 뷰 (V50 최종 정의)
-- Profile: postgres-mart
--
-- 예약통계_채널별 화면이 쓴다. 예약자 리스트와 같은 행을 보므로 합계가 항상 맞는다.
-- 원천 채널 판정 규칙·매핑 테이블 정의는 V43 이 담당 (reservation_channel_staff 테이블 + 시드).
--
-- ★ 채널 판정 우선순위 (아래 SELECT 절 COALESCE 참조):
--   ① 내원동기(중)  — 모두닥·카페·크리에이트립 등 **매체 이름이 직접 적힌** 값
--   ② 직원 설정표   — 자사 해외팀처럼 사람 이름으로 등록되는 유입 (reservation_channel_staff · V43 정의)
--   ③ RESERVE_PATH  — 홈페이지·앱·네이버·인콜·아웃콜
--
--   내원동기가 먼저인 이유 — 모두닥 보고 전화로 예약하면 RESERVE_PATH 는 '인콜' 이다.
--   경로만 보면 모두닥이라는 채널 자체가 안 보인다(2026-01~08 847건이 전부 여기서 나온다).
--
-- ⚠️ 미분류가 나오지 않는다. list_reservation 은 RESERVE_PATH 가
--    CTI·CRM·ONLINE·APP·NAVER 인 행만 담으므로 ③에서 반드시 걸린다.
--    2026-01~08 11,076건 전수 확인함(미분류 0).
--
-- ⚠️ 카카오는 채널에 두지 않는다. RESERVE_PATH 에 KAKAO 가 있지만 예약자 리스트가
--    제외한다(해피톡 소스라 RESERVATION 에 안 들어옴). 칸을 두면 항상 0 이라 오해를 부른다.
--
-- 계승 이력 (V50 이 세 세대 정의를 완전 재작성해 담고 있음):
--   V43 → 기본 정의 (채널 판정 3계층) + reservation_channel_staff 테이블·시드 (테이블은 V43 만 정의)
--   V48 → + op_type_r · op_type_l (실제 수술 유형 · surgery_op_type() 함수 사용)
--   V50 → + surgery_reg_date · surgery_date · surgery_payment (V49 컬럼 활용)
--   ⚠️ V50 이 완전 재정의라 V48 은 MartSchemaInitializer 에서 제외됨.
--   ⚠️ V43 은 reservation_channel_staff 테이블 CREATE 가 유일하게 있어 **initializer 실행 필수**.
--
-- 실제 수술 유형 배경 (V48 계승):
--   예약자 리스트에 수술명(surgery_r/surgery_l)이 생겼다(2feeb70).
--   원천은 OPERATIONDATA·Cataract_Operationdata — **실제로 한 수술**이고 수술자 리스트와 같은
--   원천·같은 제외목록이라 표기가 일치한다. 그전까지 채널 화면의 '수술 유형별'은 그 해 누적 비중으로
--   나눈 **추정치**였다. 이제 실제 유형을 셀 수 있어 추정을 걷어낸다.
--
-- ⚠️ 수술등록(수술예약)이 있어도 수술명이 없는 건이 있다 — 아직 수술 전이라서다.
--    2026-07: 수술등록 735건 중 수술명 574건(78%). 유형별 합계가 수술등록 인원보다 적은 게 정상.
--    화면에서 "수술 완료 N명 기준" 이라고 밝힌다.
-- ⚠️ 분류는 surgery_op_type() 함수를 쓴다(V47). v_all_surgery_list 와 같은 정의다 —
--    복사해 두면 한쪽만 고쳐서 어긋난다.
--
-- V50 추가 — 채널별 매출·객단가를 내려면 1인당 수술 금액이 뷰에 있어야 한다(V49 컬럼).
--   surgery_payment : (고객, 수술일)의 COSTPRICE 합. 수술 전이면 0.
--   surgery_date    : 그 수납을 찾은 키. surgery_reg_date(수술예약 등록일)와 다른 값이다.
--
-- ⚠️ CREATE OR REPLACE 를 쓰지 않는다. 컬럼을 중간에 추가하면
--    "cannot change name of view column" 으로 기동이 실패한다. DROP 후 생성한다.
-- =========================================================

DROP VIEW IF EXISTS v_reservation_channel;
CREATE VIEW v_reservation_channel AS
SELECT
    r.registered_at,
    r.chart_no,
    r.name,
    r.reserve_state,
    r.channel        AS reserve_path_channel,   -- 원래 경로(참고용)
    r.motive_m,
    r.exam_reg_date,
    -- 사람 식별자 — 건수와 사람수를 같이 세기 위한 키.
    -- ⚠️ 더미 번호를 거른다. 연락처를 모르는 예약에 0 을 채워 넣는 관행이 있어
    --    2026-07 에 '00000000000' 74건·'0000' 9건·'0' 4건이 있었다.
    --    거르지 않으면 서로 다른 87명이 3명으로 뭉개진다.
    CASE WHEN r.hp ~ '^[0-9]{9,}$' AND r.hp !~ '^0+$' THEN 'H|' || r.hp
         WHEN r.email LIKE '%@%'                      THEN 'E|' || r.email
         WHEN r.chart_no <> '9999999999999'           THEN 'C|' || r.chart_no
         ELSE 'N|' || r.name END AS person,
    r.exam_stop,
    r.surgery_reg_date,
    r.surgery_date,
    r.surgery_payment,
    -- 실제 수술명(눈별). 빈 값·제외 시술명은 NULL 로 만들어 집계에서 자연히 빠진다.
    -- 백내장 여부는 판정할 근거가 이 표에 없다 — 2026-01~08 실측 5,687건 중 백내장은 1건이라
    -- 시력교정 분류로 본다(백내장 유입은 예약 경로가 달라 이 리스트에 거의 없다).
    CASE WHEN surgery_name_excluded(r.surgery_r) THEN NULL
         ELSE surgery_op_type(r.surgery_r, false) END AS op_type_r,
    CASE WHEN surgery_name_excluded(r.surgery_l) THEN NULL
         ELSE surgery_op_type(r.surgery_l, false) END AS op_type_l,
    COALESCE(
        -- ① 내원동기(중)에 매체명이 직접 적힌 경우
        CASE r.motive_m
            WHEN '모두닥'         THEN '모두닥'
            WHEN '카페'           THEN '카페'
            WHEN '크리에이트립'   THEN '크리에이트립'
            WHEN '에이젼시(외국)' THEN '해외에이전시'
            WHEN '강남언니'       THEN '기타플랫폼'
            WHEN '바비톡'         THEN '기타플랫폼'
            ELSE NULL
        END,
        -- ② 직원 설정표(자사 해외 등)
        st.channel,
        -- ③ 예약 경로
        r.channel
    ) AS channel
  FROM list_reservation r
  LEFT JOIN reservation_channel_staff st ON st.motive_m = r.motive_m;
