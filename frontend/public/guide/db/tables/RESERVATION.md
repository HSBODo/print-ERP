# RESERVATION

> **DB**: SOFTCRM | **컬럼**: 58개 | **행 수**: ~3,478,570 (WORK DB 기준)
> **최종 갱신**: 2026-04-20

## 역할

예약 마스터 테이블. 환자의 진료/검사/수술 예약 정보를 관리하며, 350만건 이상의 대용량 테이블이다. 예약 생성·변경·취소·접수·퇴원 등 전체 예약 라이프사이클을 `RESERVE_STATE`로 추적한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | RESERVE_NUM | char(22) | 예약번호 |
| FK → CUSTOM | CUST_NUM | char(13) | 고객번호. `CUSTOM.CustNum` 참조 |
| FK → EMPLOYEE | SELECT_DOC | char(6) | 지정의사. `EMPLOYEE.EMP_NUM` 참조 |
| FK → EMPLOYEE | RESERVE_DOC | char(6) | 예약의사. `EMPLOYEE.EMP_NUM` 참조 |
| FK → EMPLOYEE | RESERVE_EMP | char(6) | 예약 등록 상담사. `EMPLOYEE.EMP_NUM` 참조 |
| FK → EMPLOYEE | REGISTER_EMP | char(6) | 등록 직원. `EMPLOYEE.EMP_NUM` 참조 |
| FK → MEDICAL_TIME_CFG | RESERVE_FLAG | char(1) | 진료유형 코드. `MEDICAL_TIME_CFG.RESERVE_FLAG` 참조 |
| FK → MEDICAL_SUB_CFG | RESERVE_FLAG + RESERVE_JINRYO | char(1) + varchar(2) | 진료 세부유형. `MEDICAL_SUB_CFG` 참조 |
| FK → ROOM_CFG | RESERVE_FLAG + RESERVE_SEQ | char(1) + int | 진료실. `ROOM_CFG` 참조 |
| ← FK RESERVATION_ETC_INFO | RESERVE_NUM | char(22) | 예약 부가정보 (소개자 등) |
| ← FK RESERVE_HISTORY | RESERVE_NUM | char(22) | 예약 변경이력 (감사 추적) |
| JOIN | CUST_NUM + RESERVE_DATE | | 고객별 날짜 조건 검색에 빈번히 사용 |

## 핵심 컬럼 (상위 15개)

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| RESERVE_NUM | char(22) | N | 예약번호 (PK) | |
| CUST_NUM | char(13) | Y | 고객번호 | CUSTOM FK |
| CUST_NAME | nvarchar(100) | Y | 고객명 (비정규화) | |
| RESERVE_DATE | char(10) | Y | 예약일자 | `YYYY-MM-DD` |
| START_TIME | char(5) | Y | 시작시간 | `HH:MM` |
| END_TIME | char(5) | Y | 종료시간 | `HH:MM` |
| RESERVE_FLAG | char(1) | Y | 진료유형 코드 | MEDICAL_TIME_CFG FK. 예: 수술, 검사, 외래 등 |
| RESERVE_JINRYO | varchar(2) | Y | 진료 세부유형 | MEDICAL_SUB_CFG.SUB_FLAG FK |
| RESERVE_SEQ | int | Y | 진료실 순번 | ROOM_CFG FK |
| RESERVE_STATE | char(1) | Y | 예약 상태 | `Y`=예약, `I`=접수(내원), `H`=퇴원, `C`=취소 |
| SELECT_DOC | char(6) | Y | 지정의사 | EMPLOYEE FK. 우선순위: SELECT_DOC > RESERVE_DOC |
| RESERVE_DOC | char(6) | Y | 예약의사 | EMPLOYEE FK |
| RESERVE_EMP | char(6) | Y | 예약 상담사 | EMPLOYEE FK |
| REGISTER_EMP | char(6) | Y | 등록 직원 | EMPLOYEE FK |
| HAPPYCALL_FLAG | char(1) | Y | 해피콜 상태 | |
| CANCEL_CD | char | Y | 취소 사유 코드 | RESERVE_STATE='C'일 때 사용 |
| OLD_FLAG | char(1) | Y | 구환 여부 | |
| TODAY_FLAG | char(1) | Y | 당일 예약 여부 | |
| COMMENT | nvarchar(1000) | Y | 예약 메모 | |
| PRP | nchar(1) | Y | PRP 시술 여부 | |

> 외 38개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RESERVATION'` 으로 전체 조회

## 함정 (Gotchas)

- **대용량 테이블 (350만건)**: 반드시 `WITH(NOLOCK)` 힌트 사용. 날짜 범위 없는 전체 스캔 금지
- **인덱스 성능 개선 완료**: `IX_MOTIVE_NEW02_fkey_Idx` 인덱스 추가로 예약-리콜 조회 p95 7.14s → 764ms (-89%) 달성 (2026-04-08)
- **SELECT_DOC vs RESERVE_DOC 우선순위**: 지정의사(`SELECT_DOC`)가 있으면 우선, 없으면 예약의사(`RESERVE_DOC`) 사용. 코드 패턴: `ISNULL(NULLIF(rv.SELECT_DOC, ''), rv.RESERVE_DOC)`
- **RESERVE_STATE 4가지**: `Y`(예약) → `I`(접수/내원) → `H`(퇴원) 또는 `C`(취소). 통계 집계 시 `C` 제외 필수 (`RESERVE_STATE != 'C'`)
- **CUST_NAME 비정규화**: CUSTOM.CustName과 별도로 RESERVATION에도 고객명이 저장됨. 이름 변경 시 동기화 이슈 가능
- **RESERVE_FLAG**: 진료유형 코드로 `MEDICAL_TIME_CFG`, `MEDICAL_SUB_CFG`, `ROOM_CFG` 3개 설정 테이블과 동시 JOIN하는 패턴이 일반적
- **중복 예약 체크**: 같은 의사+날짜+시간에 `RESERVE_STATE != 'C'`인 예약이 있는지 확인 필요 (reservation-service.js)

## 사용처

### EyeChartPro (Node.js)

| 파일 | 용도 | R/W |
|------|------|-----|
| `services/reservation-service.js` | 예약 CRUD, 상태 변경(접수/퇴원/취소), 중복 체크, 통계 집계 | R/W |
| `services/recall-service.js` | 리콜 대상자 조회 시 최근 예약 JOIN, 예약 성공 여부 판단 | R |
| `services/recall-surgery-service.js` | 수술 리콜 — 예약 존재 여부 확인, 의사명 JOIN | R |
| `services/customer-read-service.js` | 고객 상세 — 최근 예약 정보 서브쿼리 | R |
| `services/customer-response-service.js` | 응대이력 — 리콜 예약 연결 | R |
| `services/overseas-marketing-service.js` | 해외마케팅 — 검사일/수술일 예약 조회 | R |
| `services/sp-memo-cache.js` | SP 메모 캐시 — 예약 날짜 기준 조회 | R |
| `routes/customer-reservation.js` | 고객 예약 패널 — 예약 목록 + EMPLOYEE JOIN | R |
| `routes/cataract-exam.js` | 백내장 검사 데스크 — 날짜별 예약 목록 | R |
| `routes/cataract-desk.js` | 백내장 수술 데스크 — 날짜별 예약 | R |
| `routes/cataract-outpatient.js` | 백내장 외래 — 날짜별 예약 | R |
| `routes/desk-assignment.js` | 데스크 배정 — 예약 목록 | R |
| `routes/exam-assignment.js` | 검사 배정 — 예약 목록 | R |
| `routes/outpatient-clinic-status.js` | 외래 현황 — 예약 상태별 집계 | R |
| `routes/overseas-marketing.js` | 해외마케팅 — 예약 존재/날짜 서브쿼리 | R |
| `routes/op-chart.js` | 수술 차트 — 예약 기반 환자 조회 | R |
| `routes/consult-statistics.js` | 상담 통계 — 예약 JOIN 집계 | R |
| `routes/dna-registration.js` | DNA 등록 — 예약 날짜 JOIN | R |

> 위 외에도 **routes/ 38개 파일, services/ 7개 파일**에서 참조됨

## 관련 테이블

| 테이블 | 관계 | 설명 |
|--------|------|------|
| RESERVATION_ETC_INFO | 1:1 (RESERVE_NUM FK) | 예약 부가정보 (소개자 코드 `rei_Recommender` 등) |
| RESERVE_HISTORY | 1:N (RESERVE_NUM FK) | 예약 변경이력 — 상태/유형 변경 감사 추적 |
| MEDICAL_TIME_CFG | N:1 (RESERVE_FLAG FK) | 진료유형 설정 (이름, 색상, 단위시간) |
| MEDICAL_SUB_CFG | N:1 (RESERVE_FLAG + SUB_FLAG FK) | 진료 세부유형 설정 |
| ROOM_CFG | N:1 (RESERVE_FLAG + RESERVE_SEQ FK) | 진료실 설정 |
| CUSTOM | N:1 (CUST_NUM FK) | 고객 마스터 |
| EMPLOYEE | N:1 (SELECT_DOC, RESERVE_DOC 등 FK) | 의사/상담사 이름 JOIN |

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md) — 전체 지도 (예약 섹션 1-2)
- [docs/db/db-reservation.md](../db-reservation.md) — 예약 패널 DB 매핑 (존재 시)

## 대표 조회 예시

```sql
-- 날짜별 예약 목록 + 의사명 + 진료유형명 (reservation-service.js)
SELECT rv.RESERVE_NUM, rv.CUST_NUM, rv.CUST_NAME,
       rv.RESERVE_DATE, rv.START_TIME, rv.RESERVE_STATE, rv.RESERVE_FLAG,
       rv.HAPPYCALL_FLAG, rv.COMMENT,
       doc.EMP_NAME AS doctorName,
       mt.RESERVE_NAME AS flagName, mt.NAME_COLOR AS flagColor,
       ms.SUB_NAME, rm.ROOM_NAME
FROM RESERVATION rv WITH(NOLOCK)
LEFT JOIN dbo.EMPLOYEE doc ON doc.EMP_NUM = ISNULL(NULLIF(rv.SELECT_DOC, ''), rv.RESERVE_DOC)
  AND doc.EMP_STATE <> 'N'
LEFT JOIN dbo.EMPLOYEE reg ON reg.EMP_NUM = rv.REGISTER_EMP
LEFT JOIN dbo.EMPLOYEE cns ON cns.EMP_NUM = rv.RESERVE_EMP
LEFT JOIN dbo.MEDICAL_TIME_CFG mt ON mt.RESERVE_FLAG = rv.RESERVE_FLAG
LEFT JOIN dbo.MEDICAL_SUB_CFG ms ON ms.RESERVE_FLAG = rv.RESERVE_FLAG
  AND ms.SUB_FLAG = ISNULL(rv.RESERVE_JINRYO, '')
LEFT JOIN dbo.ROOM_CFG rm ON rm.RESERVE_FLAG = rv.RESERVE_FLAG
  AND rm.RESERVE_SEQ = rv.RESERVE_SEQ
WHERE rv.RESERVE_DATE = @date
ORDER BY rv.START_TIME

-- 고객별 최근 예약 조회 (customer-read-service.js)
SELECT TOP 1 RESERVE_DATE, RESERVE_FLAG
FROM RESERVATION WITH(NOLOCK)
WHERE CUST_NUM = @custNum
ORDER BY RESERVE_DATE DESC

-- 예약 상태별 통계 집계 (reservation-service.js)
SELECT rv.RESERVE_FLAG AS reserveFlag,
       SUM(CASE WHEN rv.RESERVE_STATE = 'Y' THEN 1 ELSE 0 END) AS reserved,
       SUM(CASE WHEN rv.RESERVE_STATE = 'I' THEN 1 ELSE 0 END) AS visited,
       SUM(CASE WHEN rv.RESERVE_STATE = 'H' THEN 1 ELSE 0 END) AS departed,
       SUM(CASE WHEN rv.RESERVE_STATE = 'C' THEN 1 ELSE 0 END) AS canceled
FROM RESERVATION rv WITH(NOLOCK)
WHERE rv.RESERVE_DATE = @date
GROUP BY rv.RESERVE_FLAG
```
