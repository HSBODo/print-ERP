# RESERVE_HISTORY

> **DB**: SOFTCRM | **컬럼**: 44개 | **행 수**: ~6,751,231 (WORK DB 기준)
> **최종 갱신**: 2026-09-08 (예약 변경이력 마트 작성 시 보강)

## 역할

예약 변경 감사 이력. RESERVATION 을 저장·변경할 때마다 그 시점의 예약 스냅샷(예약일·시간·유형·상태·담당자·고객명)이
한 행씩 쌓인다. 예약 1건(RESERVE_NUM)에 여러 행(HISTORY_NUM)이 붙는 1:N 구조. `MEMO='예약저장'` 이 최초 저장 행이다.

대시보드에서는 두 곳이 읽는다.
- **예약통계_시력교정** (`sql/softcrm/reservation/stats/`) — 홈페이지 접수/예약/취소 채널 집계 (MEMO='예약저장' 행).
- **예약 변경이력** (`sql/softcrm/reservation/history/select-reservation-change-history.sql`) — 같은 예약번호의 예약일이
  바뀐 흐름을 체인으로 접어 `list_reservation_change` 마트에 싣는다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | HISTORY_NUM | char(22) | 이력 번호 |
| FK → RESERVATION | RESERVE_NUM | char(22) | 예약번호. 예약 1건에 이력 N행 |
| FK → CUSTOM | CUST_NUM | char(13) | 고객번호 |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| HISTORY_NUM | char(22) | N | 이력 번호 | PK |
| CUST_NUM | char(13) | Y | 고객번호 |  |
| RESERVE_NUM | char(22) | N | 예약번호 | 앞 6자리 = 채번일 YYMMDD |
| RESERVE_DATE | char(10) | Y | 그 시점의 예약일 (YYYY-MM-DD) | 변경 판정 기준 |
| START_TIME | char(5) | Y | 시작시간 |  |
| END_TIME | char(5) | Y | 종료시간 |  |
| RESERVE_FLAG | nvarchar(30) | Y | 진료유형 (M 시력교정검사 · D 드림렌즈 · H 백내장 · O 수술 …) |  |
| RESERVE_STATE | char(1) | Y | 그 시점의 상태 Y/I/H/C |  |
| EMP_NUM | char(6) | Y | 저장한 직원 |  |
| MEMO | nvarchar(200) | Y | 이력 사유 | `'예약저장'` = 최초 저장 |
| HISTORY_TIME | varchar(50) | Y | 저장 시각 | **문자열**. 아래 함정 참조 |
| HISTORY_IP | varchar(50) | Y | 저장 IP |  |
| CUST_NAME | nvarchar(100) | Y | 고객명 (비정규화) |  |
| CUST_ENAME | nvarchar(30) | Y | 영문명 |  |
| CALL_NUM1 | varchar(30) | Y | 연락처 |  |

> 외 29개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RESERVE_HISTORY'` 으로 전체 조회

## 함정 (Gotchas)

- **대용량(675만 행)**: 반드시 `WITH(NOLOCK)` + HISTORY_TIME 범위. 전체 스캔 금지.
- **HISTORY_TIME 은 varchar(50)**: 범위 조건은 `HISTORY_TIME >= CONVERT(datetime, :from)` 처럼 datetime 과 비교해야
  인덱스를 탄다(기존 예약통계 SQL 패턴). 형식이 섞인 행이 있을 수 있어 값 자체는 원문으로 가져와 Java 에서 파싱한다
  (`ReservationChangeChainBuilder.parseTime` — 못 읽으면 시각을 비운다). `TRY_CONVERT` 는 서버가 지원하지 않는다.
- **온라인 예약 시각 지연**: 심야 홈페이지 예약이 새벽 배치로 저장돼 HISTORY_TIME 이 +9h 밀려 다음날로 잡히는 케이스가 있다.
  예약통계는 그래서 등록일을 `RESERVE_NUM` 앞 6자리(YYMMDD 채번일)로 본다. 변경이력은 기획서 §3 3순위
  (① 이력 첫 저장 시각 → ② RESERVATION.InsertedDateTime → ③ 채번일)를 따르며 출처를 `reg_source` 로 남긴다.
- **같은 예약일 재저장이 많다**: 시간·담당자만 바꿔도 행이 쌓인다. "변경" 은 예약일(RESERVE_DATE)이 직전 행과 달라진
  경우만 센다(A→B→A 는 2회). 같은 예약번호의 예약일이 2가지 이상 나타나야 "변경된 예약" 이다.
- **최종 예약일은 이력이 아니라 RESERVATION.RESERVE_DATE**: 마지막 이력 행과 현재값이 다를 수 있다(재방문 케이스 보정).
- **제외 행**: 테스트 이름(`테스트`/`TEST`), 시스템 블록 고객(`8888…`), 미등록 더미(`9999…`). 취소·미내원은 포함한다.

## 사용처

| 파일 | 용도 | R/W |
|------|------|-----|
| `sql/softcrm/reservation/stats/select-system-daily-counts.sql` | 예약통계_시력교정 — 홈페이지 채널 (MEMO='예약저장') | R |
| `sql/softcrm/reservation/stats/select-system-drill-down.sql` | 예약통계 드릴다운 | R |
| `sql/softcrm/reservation/history/select-reservation-change-history.sql` | 예약 변경이력 마트 원천 (ReservationChangeMartJob) | R |

## 관련 문서

- [RESERVATION.md](./RESERVATION.md) — 예약 마스터 (RESERVE_NUM FK)
- `docs/db/mart-inventory.md` — `list_reservation_change` 마트

## 대표 조회 예시

```sql
-- 한 예약의 예약일 변경 흐름 (저장 순)
SELECT h.HISTORY_TIME, h.RESERVE_DATE, h.RESERVE_STATE, h.MEMO
FROM RESERVE_HISTORY h WITH(NOLOCK)
WHERE h.RESERVE_NUM = :reserveNum
ORDER BY h.HISTORY_TIME, h.HISTORY_NUM
```
