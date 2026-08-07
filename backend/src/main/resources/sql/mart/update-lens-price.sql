-- 렌즈 단가 저장. UPDATE 만 한다 — 새 op_type 을 화면에서 만들 수 없게 막는 것이다.
-- 유형 코드는 surgery_op_type() 이 정하므로, 오타로 만든 행이 생기면
-- 어떤 수술과도 매칭되지 않는 유령 단가가 영원히 남는다.
UPDATE lens_cost
   SET unit_cost_manwon = :cost,
       updated_at       = CURRENT_TIMESTAMP
 WHERE op_type = :opType
