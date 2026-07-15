-- 현재 소스가 담고 있는 마지막 등록일시.
--
-- 소스가 스냅샷(로컬 캐시)이면 이 시점 이후 구간은 데이터가 아예 없어, 조회하면
-- 에러 없이 '조용히 적은 건수'가 나온다 — 가장 알아채기 어려운 실패다(가이드 문서 §0).
-- 화면이 이 값과 조회 종료일을 비교해 경고를 띄우므로, 삭제건 필터(del_tf)는 걸지 않는다.
-- 데이터 신선도 판단이 목적이지 조회 대상 집계가 아니기 때문이다.
SELECT COALESCE(MAX(reg_date), '') AS "snapshotMaxRegDate"
  FROM consultations
 WHERE category = 'COUNSELONLINE'
