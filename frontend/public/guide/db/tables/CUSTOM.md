# CUSTOM

> **DB**: SOFTCRM | **컬럼**: 61개 | **행 수**: ~583,429 (WORK DB 기준)
> **최종 갱신**: 2026-04-20

## 역할

메인 고객 마스터 테이블. 모든 고객의 인적사항, 연락처, 담당 직원, 등급, 내원 이력 등 핵심 정보를 보유하며, 시스템 전체에서 가장 빈번하게 JOIN되는 중심 테이블이다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | `CUST_NUM` | char(13) | 고객번호 (13자리 고정 숫자 문자열, 예: `0000006030000`) |
| FK → | `MY_COUNSELOR` | char(6) | → `EMPLOYEE.EMP_NUM` (상담사) |
| FK → | `MY_DOCTOR` | char(6) | → `EMPLOYEE.EMP_NUM` (강제지정 의사) |
| FK → | `MY_optometrist` | nchar(6) | → `EMPLOYEE.EMP_NUM` (검안사) |
| FK → | `MY_MEDICDOCTOR` | char(6) | → `EMPLOYEE.EMP_NUM` (지정의) |
| FK → | `SelectDoc` | nvarchar(6) | → `EMPLOYEE.EMP_NUM` (상담의) |
| FK → | `regemp_num` | nvarchar(6) | → `EMPLOYEE.EMP_NUM` (등록자) |
| FK → | `NATION_CODE` | nvarchar | → `NationCustom_CFG.Code` (국가코드) |
| FK → | `VIP_CODE` | nvarchar | → `VIPCustom_CFG.Code` (VIP 분류) |
| FK → | `InsuranceCode` | char(10) | 보험사 코드 (전용 CFG 테이블 없음, 프론트 하드코딩) |
| ← FK | `CUSTOM_HISTORY` | — | 변경이력 (CUST_NUM 참조) |
| ← FK | `CUSTOM_MEMO` | — | 메모 히스토리 (CUST_NUM 참조, RTF 형식) |
| ← FK | `SNS_LIST` | — | SNS 정보 (Cust_Num 참조) |
| ← FK | `Relation_List` | — | 고객 관계 (Cust_num 참조) |
| ← FK | `CusTolCst` | — | 동의서 관리 (CusNum 참조) |
| JOIN | `CUST_NUM` | — | RESERVATION_LIST, MOTIVE_NEW01, Mh_Opdesk, PrcItmLst 등 거의 모든 테이블과 JOIN |

## 핵심 컬럼 (상위 15개)

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| `CUST_NUM` | char(13) | N | 고객번호 | PK. 13자리 고정 (예: `0000006030000`) |
| `CUST_NAME` | nvarchar(100) | Y | 성명(한글) | 검색 시 `IX_CUSTOM_CustName_Covering` 인덱스 활용 |
| `CUST_ENAME` | varchar(200) | Y | 성명(영문) | 해외환자 매칭에 사용 |
| `BIRTH_DAY` | char(10) | Y | 생년월일 | `YYYY-MM-DD` 형식 |
| `JUMIN_NUM` | varbinary(100) | Y | 주민등록번호 (암호화) | `DECRYPTBYPASSPHRASE()` 복호화 필요. **고비용 — 일반 검색에서 제외**. 성별은 복호화 후 7번째 자리로 파생 |
| `CALL_NUM1` | varchar(30) | Y | 전화번호 | 하이픈 없이 저장, 프론트에서 `formatPhone()` |
| `CALL_NUM2` | varchar(30) | Y | 핸드폰 | 동일. SMS 발송 기본 번호 |
| `EMAIL` | varchar(50) | Y | 이메일 | 프론트에서 `@` 기준 split (local/domain) |
| `VIP_CODE` | nvarchar | Y | VIP 분류 코드 | → `VIPCustom_CFG.Code` 참조 |
| `Level` | nvarchar(1) | Y | 고객 등급 | `V`=VIP, `G`=Gold, `S`=Silver, `R`=Normal (기본값 `R`) |
| `MY_COUNSELOR` | char(6) | Y | 담당 상담사 | `E00XXX` 형식, EMPLOYEE.EMP_NUM FK |
| `MY_DOCTOR` | char(6) | Y | 강제지정 의사 | `E00XXX` 또는 `KD0618` 등 |
| `MY_optometrist` | nchar(6) | Y | 담당 검안사 | `E00XXX` 형식 |
| `NATION_CODE` | nvarchar | Y | 국가코드 | → `NationCustom_CFG.Code` (숫자코드) |

### 추가 주요 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| `FIRST_DAY` | char(10) | Y | 등록일 | `YYYY-MM-DD`, readonly |
| `LAST_DAY` | char(10) | Y | 최종 방문일 | `YYYY-MM-DD`, readonly |
| `SMS_GEOBU` | char(1) | Y | SMS 수신거부 | `Y`=거부 |
| `EMAIL_GEOBU` | char(1) | Y | 이메일 수신거부 | `Y`=거부 |
| `LUNAR_YN` | char(1) | Y | 음력 여부 | `Y`=음력 |
| `Marriage_YN` | char(1) | Y | 기혼 여부 | `Y`=기혼 |
| `POSITIVE_YN` | char(1) | Y | PST 여부 | |
| `SENSITIVE_YN` | char(1) | Y | 관심 고객 여부 | |
| `MY_MEDICDOCTOR` | char(6) | Y | 지정의 | EMPLOYEE FK |
| `SelectDoc` | nvarchar(6) | Y | 상담의 | EMPLOYEE FK |
| `regemp_num` | nvarchar(6) | Y | 등록자 | EMPLOYEE FK |
| `ETC` | varchar(8000) | Y | 고객정보 메모 | 플레인텍스트 (RTF 메모는 CUSTOM_MEMO 테이블). 프론트 입력 상한은 Validation에서 별도 결정 |
| `ADDR1` | nvarchar | Y | 주소 | |
| `ADDR2` | nvarchar | Y | 상세주소 | |
| `LevelLimit_Flag` | char(1) | Y | 등급연장 플래그 | 체크박스 |

> 전체 61개 컬럼은 `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CUSTOM'` 으로 조회

## 함정 (Gotchas)

- **`JUMIN_NUM` 복호화 비용**: `DECRYPTBYPASSPHRASE(hospitalCode, JUMIN_NUM)` 호출은 행당 암복호화 연산이 발생하여 매우 느림. 고객 검색 쿼리에서 주민번호 카테고리(`category === 'jumin'`)일 때만 복호화하고, 일반 이름/전화 검색에서는 제외해야 함. 이 최적화로 p99 10s → 1.48s 달성.
- **`CUST_NUM`은 char(13) 고정 길이**: 13자리 숫자 문자열로 저장되며 패딩 공백이 없음. JOIN 시 RTRIM은 불필요. 단, 타 테이블에서 char(23) 컬럼과 JOIN할 경우(예: 레거시 테이블) 상대편을 확인할 것.
- **`SEX` 컬럼은 존재하지 않음**: CUSTOM 테이블에 별도 성별 컬럼이 없다. 성별이 필요하면 `JUMIN_NUM`을 `DECRYPTBYPASSPHRASE()`로 복호화한 뒤 7번째 자리(1/3=남, 2/4=여)로 파생해야 한다. 고비용이므로 필요할 때만.
- **법정대리인 연락처는 `CALL_NUM3` 사용 (GdnContact 미사용)**: DB 스키마에 `GdnContact`, `GdnName`, `GdnRelation`, `GdnContactMsgSend` 컬럼이 존재하지만 운영 데이터 0건. 실제 시스템은 `CALL_NUM3`(48,252건 보유)을 법정대리인 연락처로 사용하며, SELECT 시 `CALL_NUM3 AS GdnContact` 별칭으로 노출. 신규 기능에서도 동일 컨벤션 유지. (2026-04-20 Lint에서 확인)
- **6개 직원 필드 모두 `EMPLOYEE.EMP_NUM` 참조**: `MY_COUNSELOR`, `MY_DOCTOR`, `MY_optometrist`, `MY_MEDICDOCTOR`, `SelectDoc`, `regemp_num` — 모두 char(6), `E00XXX` 형식. 타입 혼재 주의 (char/nchar/nvarchar).
- **메모는 별도 테이블**: `CUSTOM.ETC`는 varchar(8000) 플레인텍스트 메모. 본격적인 메모 히스토리는 `CUSTOM_MEMO` 테이블이며 **RTF 형식**으로 저장됨. 프론트에서 표시 시 RTF → 플레인텍스트 변환 필요.
- **`Level` 기본값**: NULL일 수 있으므로 `ISNULL(Level, 'R')` 처리 필요. 값: `V`/`G`/`S`/`R`.
- **`InsuranceCode` CFG 없음**: 전용 설정 테이블이 존재하지 않아 프론트에서 하드코딩. 코드값 불일치(INS00X vs 0X) 주의.
- **`JUMIN_NUM_TEMP`**: 마스킹된 임시 주민번호. 조회 전용이며 저장에는 사용하지 않음.

## 사용처

### EyeChartPro (Node.js)

| 파일 | 용도 | R/W |
|------|------|-----|
| `services/customer-read-service.js` | 고객 검색, 상세 조회, 등급 조회, 전화번호 조회 | R |
| `services/customer-write-service.js` | 고객 정보 수정, 신규 번호 채번 | W |
| `services/customer-visit-motive-service.js` | 내원동기 조회 시 CUSTOM 참조 | R |
| `services/customer-etc-panels-service.js` | 기타 패널(소개관계 등) | R |
| `services/sp-memo-cache.js` | 메모 캐시 — CUSTOM + CUSTOM_MEMO JOIN | R |
| `services/recall-service.js` | 리콜 목록 — CUSTOM JOIN | R |
| `services/recall-surgery-service.js` | 수술 리콜 — CUSTOM JOIN | R |
| `services/reservation-service.js` | 예약 목록 — CUSTOM JOIN | R |
| `services/overseas-marketing-service.js` | 해외마케팅 — 이름/생년/이메일로 CUSTOM 매칭 | R |
| `routes/customer-qa.js` | 고객 QA 조회 | R |
| `routes/referral.js` | 소개고객 관리 | R |
| `routes/vip.js` | VIP 관리 | R |
| `routes/referral-vip.js` | 소개VIP | R |
| `routes/surgery-lens-order.js` | 렌즈 주문 — CUSTOM JOIN | R |
| `routes/cataract-desk.js` | 백내장 데스크 | R |
| `routes/exam-assignment.js` | 검사배정 | R |
| `routes/desk-assignment.js` | 데스크배정 | R |
| `routes/clinic-statistics.js` | 진료통계 | R |
| `routes/stats-*.js` | 각종 통계 (10+개 라우트) | R |
| `routes/overseas-marketing.js` | 해외마케팅 라우트 | R |
| `routes/overseas-stats.js` | 해외통계 | R |
| `routes/b2b-*.js` | B2B 법인 (예약/정산/수술) | R |
| `routes/op-chart.js` | 수술차트 | R |
| `routes/surgery-schedule.js` | 수술일정 | R |
| `routes/surgery-status.js` | 수술현황 | R |
| `routes/outpatient-*.js` | 외래진료 | R |
| `routes/emergency-call.js` | 응급연락 | R |
| `routes/dna-registration.js` | DNA 등록 | R |
| `routes/point-staff.js`, `point-director.js` | 포인트 관리 | R |

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md) — 전체 DB 구조 지도
- [db-customer.md](../db-customer.md) — 고객정보 패널 프론트↔DB 매핑 상세
- [db-code-tables.md](../db-code-tables.md) — VIPCustom_CFG, NationCustom_CFG 등 코드 테이블

## 대표 조회 예시

```sql
-- 고객 검색 (이름 기준, 상담사 JOIN, 상위 501건)
SELECT TOP 501
  A.CUST_NUM, '구환' AS FLAG, A.CUST_NAME,
  ISNULL(A.CUST_ENAME, '') AS CUST_ENAME,
  '' AS JUMIN,  -- 주민번호는 jumin 카테고리에서만 복호화
  A.CALL_NUM1, A.CALL_NUM2, A.CALL_NUM3, A.LAST_DAY,
  ISNULL(A.EMAIL, '') AS EMAIL,
  ISNULL(cns.EMP_NAME, '') AS counselorName
FROM CUSTOM A WITH(NOLOCK)
LEFT JOIN EMPLOYEE cns ON cns.EMP_NUM = A.MY_COUNSELOR
WHERE A.CUST_NAME LIKE @keyword + '%'
ORDER BY A.CUST_NAME ASC, A.CUST_NUM ASC
```

```sql
-- 고객 등급 조회
SELECT ISNULL(Level, 'R') AS level
FROM CUSTOM WITH(NOLOCK)
WHERE CUST_NUM = @custNum
```
