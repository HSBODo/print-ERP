-- 현재 소스가 담고 있는 마지막 등록일시. [MariaDB · 실시간]
--
-- 실시간 소스에서는 이 값이 '스냅샷 천장'이 아니라 그냥 '가장 최근 등록건 시각'이다.
-- 그래서 화면은 이 값으로 경고를 띄우지 않는다 — 경고는 스냅샷 소스일 때만 의미가 있다
-- (LegacyDialect 로 판별해 live=true 를 내려보내고, 화면이 그걸 보고 배너를 끈다).
-- 값 자체는 데이터 신선도 표시용으로 계속 내려보낸다("마지막 등록건: ...").
--
-- 삭제건 필터(DEL_TF)는 걸지 않는다 — 신선도 판단이 목적이지 조회 대상 집계가 아니다.
-- ../sqlite/last-reg-date.sql 과 결과 계약(문자열 1개)이 동일해야 한다.
SELECT COALESCE(DATE_FORMAT(MAX(REG_DATE), '%Y-%m-%d %H:%i:%s'), '') AS `lastRegDate`
  FROM TBL_COUNSEL
 WHERE CATEGORY = 'COUNSELONLINE'
