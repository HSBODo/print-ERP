-- =========================================================
-- 누적 안수 리스트 — 화면 조회 (Postgres 마트).
--
-- 필터:
--   from..to           : 수술일 반개구간 (operation_date >= from AND < to + 1 day)
--   query (선택)       : 검색 키워드. field 로 대상 컬럼을 제한한다.
--                        숫자 컬럼(cust_num · accumulated_eye_count)은 CAST 후 문자열 부분일치 +
--                        query 가 순수 숫자면 정확 일치도 함께 매칭한다 —
--                        B-tree 인덱스(idx_list_accumulated_eyes_cust_num · _eye_count) 활용 O(log n).
--   field              : 'all' | 'name' | 'chart' | 'phone' | 'eyes' — 어느 컬럼을 매치할지.
--                        'all' 이면 4컬럼 모두. 그 외 값은 해당 컬럼만 매치(불필요 스캔 축소).
--   is_active = TRUE   : 비활성 안수(원천에서 폐기된 행) 는 기본 제외
--                        — 마트에는 남기지만 화면에서는 안 보이는 게 자연.
--
-- 정렬: 최신 수술일 → 같은 날 안에서는 안수 오름차순(안수 순서대로 R→L 나열 목적).
-- 별칭 camelCase — 프론트 zod 계약.
-- =========================================================

SELECT
    id                                                    AS "id",
    cust_num                                              AS "custNum",
    COALESCE(custom_name, '')                             AS "customName",
    COALESCE(custom_phone, '')                            AS "customPhone",
    COALESCE(operation_category, '')                      AS "operationCategory",
    COALESCE(operation_code, '')                          AS "operationCode",
    TO_CHAR(operation_date, 'YYYY-MM-DD')                 AS "operationDate",
    accumulated_eye_count                                 AS "accumulatedEyeCount",
    COALESCE(eye_position, '')                            AS "eyePosition",
    TO_CHAR(create_date, 'YYYY-MM-DD HH24:MI:SS')         AS "createDate",
    TO_CHAR(last_modified_date, 'YYYY-MM-DD HH24:MI:SS')  AS "lastModifiedDate"
  FROM list_accumulated_eyes
 WHERE operation_date >= CAST(:from AS DATE)
   AND operation_date <  CAST(:to   AS DATE) + INTERVAL '1 day'
   AND is_active = TRUE
   AND (
        :query = ''
     OR ( :field IN ('all','name')  AND LOWER(COALESCE(custom_name,  '')) LIKE '%' || LOWER(:query) || '%' )
     OR ( :field IN ('all','phone') AND LOWER(COALESCE(custom_phone, '')) LIKE '%' || LOWER(:query) || '%' )
     OR ( :field IN ('all','chart') AND (
             CAST(cust_num AS VARCHAR) LIKE '%' || :query || '%'
          -- 순수 숫자면 정확 일치 병렬 매칭 → B-tree(idx_..._cust_num) 활용 O(log n).
          OR ( :query ~ '^[0-9]+$' AND cust_num = CAST(:query AS BIGINT) )
        ) )
     OR ( :field IN ('all','eyes')  AND (
             CAST(accumulated_eye_count AS VARCHAR) LIKE '%' || :query || '%'
          -- 순수 숫자면 정확 일치 병렬 매칭 → B-tree(idx_..._eye_count) 활용 O(log n).
          OR ( :query ~ '^[0-9]+$' AND accumulated_eye_count = CAST(:query AS BIGINT) )
        ) )
   )
 ORDER BY operation_date DESC, accumulated_eye_count ASC
