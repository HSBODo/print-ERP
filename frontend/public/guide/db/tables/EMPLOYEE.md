# EMPLOYEE

> **DB**: SOFTCRM | **컬럼**: 50개 | **행 수**: ~1,440 (WORK DB 기준)
> **최종 갱신**: 2026-04-20

## 역할

직원 마스터 테이블. 의사, 상담사, 검안사 등 병원 전 직군의 인사정보를 관리하며, 거의 모든 업무 테이블에서 LEFT JOIN으로 참조되는 핵심 코드 테이블이다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | EMP_NUM | char(6) | 사번. 형식 `E00XXX` (레거시) 또는 `BW00XX` (ECP 신규) |
| FK → POST_CFG | POST | char(2) | 부서 코드. `POST_CFG.POST_CD` 참조 |
| FK → GRADE_CFG | GRADE | char(2) | 직급 코드. `GRADE_CFG.GRADE_CD` 참조 |
| ← FK ECP_Auth | EMP_NUM | char(6) | ECP 인증/권한 테이블에서 참조 |
| JOIN | EMP_NUM | char(6) | CUSTOM.MY_COUNSELOR, MY_DOCTOR, MY_optometrist, RESERVATION.SELECT_DOC, RESERVE_DOC, RESERVE_EMP, REGISTER_EMP 등 수십 개 테이블에서 LEFT JOIN |

## 핵심 컬럼 (상위 15개)

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| EMP_NUM | char(6) | N | 사번 (PK) | `E00XXX` 또는 `BW00XX` |
| EMP_NAME | nvarchar(30) | Y | 직원 이름 | 대부분의 JOIN에서 이 값을 SELECT |
| EMP_PW | nvarchar(10) | N | 비밀번호 (레거시, S-CRM용) | ECP는 ECP_Auth.password_hash 사용 |
| HOSPITAL | char(1) | Y | 병원 코드 | |
| GRADE | char(2) | Y | 직급 코드 | GRADE_CFG.GRADE_CD FK |
| POST | char(2) | Y | 부서 코드 | POST_CFG.POST_CD FK |
| EMP_STATE | char(1) | Y | 재직 상태 | `Y`=재직, `N`=퇴직 |
| FIRST_DAY | char(10) | Y | 입사일 | `YYYY-MM-DD` 문자열 |
| RETIRE_DAY | char(10) | Y | 퇴사일 | |
| EMP_Tel | varchar | Y | 전화번호 | |
| MANAGE_FLAG | char(1) | Y | 관리자 여부 플래그 | |
| SETTING_FLAG | char(1) | Y | 설정 접근 권한 | |
| ALLIM_FLAG | char(1) | Y | 알림 수신 여부 | |
| CHANGE_FLAG | char(1) | Y | 변경 권한 플래그 | |
| REPORT_FLAG | char(1) | Y | 리포트 권한 플래그 | |

> 외 35개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'EMPLOYEE'` 으로 전체 조회

## 함정 (Gotchas)

- **퇴직자 필터링 필수**: 활성 직원만 조회할 때 반드시 `EMP_STATE <> 'N'` 조건 추가. 누락하면 퇴직자가 드롭다운/목록에 노출됨
- **LEFT JOIN 폭발**: 검사 데스크(`cataract-exam.js`) 등에서 담당자 필드가 20개 이상이어서 EMPLOYEE를 20번 이상 LEFT JOIN하는 쿼리 존재. 별칭(alias) 관리에 주의
- **EMP_NUM 형식 혼재**: 레거시 `E00XXX`, ECP 신규 `BW00XX`. `LIKE` 검색 시 접두어 주의
- **EMP_PW는 레거시 전용**: ECP에서는 `ECP_Auth.password_hash` (bcrypt) 사용. `EMPLOYEE.EMP_PW`에 의존 금지
- **CUSTOM 테이블의 직원 참조 필드 6개**: `MY_COUNSELOR`, `MY_DOCTOR`, `MY_optometrist`, `MY_COUNSELOR2`, `Recommender_Staff` 등 — 모두 `EMP_NUM` char(6) 값

## 사용처

### EyeChartPro (Node.js)

| 파일 | 용도 | R/W |
|------|------|-----|
| `services/customer-read-service.js` | 전 직원 목록 조회, 고객 담당자(상담사/의사/검안사) 이름 JOIN | R |
| `services/staff-service.js` | 직원 CRUD, POST_CFG/GRADE_CFG JOIN, 다음 사번 채번 | R/W |
| `services/permission-admin-service.js` | RBAC 권한 관리, ECP_Auth JOIN | R |
| `services/reservation-service.js` | 예약 담당의/등록자 이름 JOIN | R |
| `services/recall-service.js` | 리콜 담당자/상담사/검안사/의사 이름 JOIN (6회 이상 LEFT JOIN) | R |
| `services/recall-surgery-service.js` | 수술 리콜 담당자 이름 JOIN | R |
| `services/customer-response-service.js` | 응대이력 담당자 이름 JOIN | R |
| `services/customer-etc-panels-service.js` | 예약이력/상담이력 담당자 이름 JOIN | R |
| `services/customer-visit-motive-service.js` | 내원동기 드롭다운용 직원 목록 (GRADE_CFG/POST_CFG JOIN) | R |
| `routes/auth.js` | 로그인 시 ECP_Auth + EMPLOYEE + POST_CFG JOIN | R |
| `routes/cataract-exam.js` | 백내장 검사 데스크 — EMPLOYEE 20회 LEFT JOIN (담당자 필드별) | R |
| `routes/cataract-outpatient.js` | 백내장 외래 — EMPLOYEE 12회 LEFT JOIN | R |
| `routes/customer-reservation.js` | 고객 예약 패널 — 예약자/의사/등록자 이름 JOIN | R |
| `routes/agent-office.js` | 직원 목록 FROM EMPLOYEE | R |
| `routes/customer-panels.js` | 고객 패널 직원 목록 FROM EMPLOYEE | R |

> 위 외에도 **routes/ 46개 파일, services/ 16개 파일**에서 참조됨 (프로젝트 내 가장 빈번하게 JOIN되는 테이블)

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md) — 전체 지도
- [docs/specs/customer-store-api.md](../../specs/customer-store-api.md) — 고객 담당자 필드 매핑

## 대표 조회 예시

```sql
-- 활성 직원 목록 (드롭다운용)
SELECT EMP_NUM, EMP_NAME
FROM EMPLOYEE WITH(NOLOCK)
WHERE EMP_STATE <> 'N'
ORDER BY EMP_NAME

-- 직원 상세 + 부서/직급명 (staff-service.js)
SELECT e.EMP_NUM, e.EMP_NAME, e.POST, ISNULL(p.POST_NM, '') AS postName,
       e.GRADE, ISNULL(g.GRADE_NM, '') AS gradeName,
       e.EMP_STATE, e.FIRST_DAY, e.RETIRE_DAY
FROM dbo.EMPLOYEE e
LEFT JOIN dbo.POST_CFG p ON p.POST_CD = e.POST
LEFT JOIN dbo.GRADE_CFG g ON g.GRADE_CD = e.GRADE
ORDER BY e.EMP_NAME

-- 고객 조회 시 담당자 이름 JOIN (customer-read-service.js)
SELECT A.*, cns.EMP_NAME AS counselorName, doc.EMP_NAME AS doctorName
FROM CUSTOM A WITH(NOLOCK)
LEFT JOIN EMPLOYEE cns WITH(NOLOCK) ON cns.EMP_NUM = A.MY_COUNSELOR
LEFT JOIN EMPLOYEE doc WITH(NOLOCK) ON doc.EMP_NUM = A.MY_DOCTOR
```
