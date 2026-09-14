-- 렌즈 단가표 전체. 유형 행은 V51 이 미리 넣어 두므로 목록 자체는 항상 있다(단가만 0).
SELECT op_type, unit_cost_manwon
  FROM lens_cost
 ORDER BY op_type
