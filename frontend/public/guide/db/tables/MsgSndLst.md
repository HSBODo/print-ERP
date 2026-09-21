# MsgSndLst

> **DB**: SOFTCRM | **컬럼**: 15개 | **행 수**: ~6,730,927 (WORK DB 기준)
> **최종 갱신**: 2026-04-20

## 역할

SMS/MMS/카카오 알림톡/친구톡 발송 이력 테이블. 수동발송과 자동발송 모두 포함하며 670만건+ 대용량 테이블.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | IDX | int (IDENTITY) | 자동 증가 일련번호 |
| FK → EMPLOYEE | SendEmp | char(6) | 발송 직원코드 → EMPLOYEE.EMP_NUM |
| FK → CUSTOM | CustNum | varchar(20) | 고객번호 → CUSTOM.CUST_NUM (**⚠️ 자동발송 시 '9999999999999' 입력됨**) |
| JOIN | Phone | varchar(30) | 수신 전화번호 — CustNum 불일치 보완용 필수 JOIN 키 |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| IDX | int | N | 일련번호 | PK, IDENTITY |
| InsertedDateTime | datetime | N | DB 입력 시각 | 레코드 생성 시점 |
| SendDateTime | datetime | Y | 실제 발송 시각 | 인덱스 대상 |
| SubJect | varchar(120) | Y | 제목 | |
| Phone | varchar(30) | Y | 수신 전화번호 | 인덱스 대상, CustNum 보완 검색 필수 |
| CallBack | varchar(30) | Y | 발신번호 | 예: 1522-6800, 02-597-2331 |
| Msg | varchar(4000) | Y | 발송 내용 | |
| FilePath | varchar(512) | Y | 첨부파일 경로 | MMS 이미지 등 |
| SendEmp | char(6) | Y | 발송 직원코드 | EMPLOYEE.EMP_NUM FK |
| CustNum | varchar(20) | Y | 고객번호 | **⚠️ 자동발송 시 '9999999999999'** |
| SendFlag | char(1) | Y | 발송 상태 | N=미발송, Y=발송 |
| GroupFlag | char(1) | Y | 그룹 발송 여부 | M=개별, G=그룹 |
| SendPoint | varchar(200) | Y | 발송 위치/경로 | 자동발송, 예약저장, CRM고객관리 등 |
| MsgCategory | int | Y | 문자 유형 | 1=SMS, 2=MMS, 3=알림톡, 4=친구톡 |
| URL | varchar(200) | Y | 첨부 URL | |

> 전체 컬럼은 `INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MsgSndLst'` 으로 조회

### MsgCategory 매핑

| 값 | 유형 | 건수 (2026-03 기준) | 분류 설정 테이블 |
|----|------|--------------------:|------------------|
| 1 | SMS | ~104만 | ScaCfg |
| 2 | MMS | ~434만 (최다) | McaCfg |
| 3 | 카카오 알림톡 | ~111만 | KCACFG |
| 4 | 카카오 친구톡 | ~10만 | KCACFG2 |
| NULL | 레거시 (2017 이전) | ~11만 | - |

### SendPoint 주요 값

| SendPoint | 의미 |
|-----------|------|
| 자동발송 | 시스템 자동 (예약 전일 알림 등) |
| 예약저장 | 예약 등록 시 자동 발송 |
| 예약수정 | 예약 변경 시 자동 발송 |
| 예약거절 | 네이버 예약 거절 시 발송 |
| CRM그룹문자전송(엑셀) | 엑셀 기반 대량 발송 |
| CRM예약관리확인문자 | 예약 확인 수동 발송 |
| CTI메인창 | CTI 상담 중 발송 |
| 통계요약 | 일간보고서 자동 발송 |

### 인덱스

| 인덱스명 | 컬럼 | 효과 |
|----------|------|------|
| PK (Clustered) | IDX | |
| IX_MsgSndLst_Phone_SendDateTime | Phone, SendDateTime | **7s → 0.5s** (고객 SMS 이력 조회) |
| (기본) | SendEmp, CustNum | 직원+고객 기준 조회 |

## 함정 (Gotchas)

- **⚠️ CRITICAL: CustNum='9999999999999' 자동발송 레코드** — 자동발송 시스템이 CustNum에 `'9999999999999'`를 넣는 경우가 있어 CustNum 단독 검색 시 자동발송 건이 누락됨. **반드시 Phone 필드를 병행 검색해야 함.** 예: 박경민(2225307) — CustNum 검색 4건, Phone 포함 검색 9건 (자동발송 5건 추가)
- **⚠️ '명동\_문자이력' 테이블은 레거시 — 사용 금지** — 명동밝은세상안과 레거시 데이터(2010년대). 비앤빛 고객 데이터 없음. 2026-03-06에 MsgSndLst 기반으로 전환 완료
- **670만건 대용량** — 풀스캔 쿼리 절대 금지. 반드시 인덱스 활용 (Phone+SendDateTime 또는 InsertedDateTime 범위)
- **MsgCategory NULL** — 2017년 이전 레거시 데이터는 MsgCategory가 NULL. 통계 집계 시 ISNULL 처리 필요
- **분류 설정 테이블 4종** — ScaCfg(SMS), McaCfg(MMS), KCACFG(알림톡), KCACFG2(친구톡). KCACFG/KCACFG2는 softcrm-schema.sql에 누락되어 있으나 DB에 존재

## 사용처

### EyeChartPro (Node.js)

| 파일 | 용도 | R/W |
|------|------|-----|
| `services/customer-read-service.js:453` | 고객별 SMS 이력 조회 (메모&SMS 패널). CustNum + Phone 병행 검색 패턴 사용 | R |
| `services/customer-sms-service.js:47` | SMS 템플릿 휴면 판별용 활성 메시지 prefix 수집 | R |
| `routes/dna-registration.js:121` | DNA 등록 — '검사 결과 정상' 문자 발송 여부 확인 (Phone JOIN) | R |
| `routes/stats-d-contact.js:181` | 컨택 통계 — 네이버 예약거절 문자 발송 확인 (Phone JOIN) | R |
| `routes/stats-d-contact.js:266` | 컨택 통계 — 기간별 전체 문자 발송 건수 집계 | R |

## 관련 문서

- [db-sms.md](../db-sms.md) — SMS/문자 발송 상세 매핑 (분류 설정 테이블 포함)
- [db-structure-overview.md](../db-structure-overview.md) — 전체 지도
- [고객관리\_데이터\_출처\_레퍼런스.md](../../specs/customer/고객관리_데이터_출처_레퍼런스.md) — 고객 패널별 데이터 출처

## 대표 조회 예시

```sql
-- ✅ 고객별 SMS 이력 (CustNum + Phone 병행 — 자동발송 누락 방지)
SELECT M.IDX, M.SendDateTime, M.SubJect, M.Msg, M.Phone,
       M.SendEmp, E.EMP_NAME, M.MsgCategory
  FROM MsgSndLst M WITH(NOLOCK)
  LEFT JOIN EMPLOYEE E WITH(NOLOCK) ON M.SendEmp = E.EMP_NUM
 WHERE M.CustNum = @custNum
 ORDER BY M.SendDateTime DESC;

-- Phone 기반 보완 조회 (CustNum이 비어있거나 9999999999999인 자동발송 건)
SELECT M.IDX, M.SendDateTime, M.SubJect, M.Msg, M.Phone,
       M.SendEmp, E.EMP_NAME, M.MsgCategory
  FROM MsgSndLst M WITH(NOLOCK)
  LEFT JOIN EMPLOYEE E WITH(NOLOCK) ON M.SendEmp = E.EMP_NUM
 WHERE M.Phone = @phone
   AND (M.CustNum = '' OR M.CustNum IS NULL)
 ORDER BY M.SendDateTime DESC;

-- ❌ 나쁨: CustNum만으로 검색 (자동발송 건 누락)
-- WHERE CustNum = @custNum
```
