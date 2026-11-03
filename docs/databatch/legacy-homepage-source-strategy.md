# 예약자 리스트_홈페이지 소스 접근 전략

> 작성일: 2026-07-15 · 최신화: 2026-08-05
> 상태: **1단계 완료**(SQLite/MariaDB 직결) · **2단계도 완료**(마트 배치 이관 — §3)
> 관련 커밋: `212ea93` (초기 SQLite 스냅샷 도입) · `b61ff05` (MariaDB 직결 추가, 2026-07-15)
> 배경 문서: [`strategy.md`](./strategy.md) (§11 마트↔메뉴 매핑 · §12 배치 실행 규칙 포함)

---

> ## ✅ 2단계 이관 완료 — §3 은 계획이 아니라 이력이다
>
> 아래 §3 이 "미착수 계획"으로 쓰여 있으나 **실제로는 구현됐다**(2026-08-05 코드 확인).
> - `sql/mart/V21__mart_list_reservation_homepage.sql` — 마트 테이블 존재
> - `batch/job/ReservationListHomepageMartJob` + `…Writer` — 배치 잡 존재, **도메인에서 가장 먼저 실행**
>   (예약 종합 계산이 이 마트를 읽기 때문)
> - `sql/mart/{delete-list-reservation-homepage-range, insert-list-reservation-homepage, select-list-reservation-homepage*}.sql`
>
> **환경변수도 개명됐다**: `LEGACY_DATASOURCE_URL` → **`HOMEPAGE_DATASOURCE_URL`**.
> 클래스도 `LegacyDataSourceConfig`/`LegacyDialect` → **`HomepageDataSourceConfig`/`HomepageSourceDialect`**.
> 아래 본문의 `LEGACY_*` 표기는 옛 이름이니 그대로 쓰지 말 것.
>
> 현행 동작(실행 순서·소스 미설정 시 skip·delete+insert 범위)은
> [`strategy.md`](./strategy.md) **§12-2-1 · §12-4-2** 가 정본이다.

## 0. TL;DR

- 홈페이지 온라인 예약 데이터는 대시보드 DB(Postgres·MSSQL)와 **다른 시스템**(레거시 홈페이지 MariaDB `bseyecom_db.TBL_COUNSEL`).
- 소스 지정: `HOMEPAGE_DATASOURCE_URL` 하나로 SQLite 스냅샷 / MariaDB 직결을 URL 접두사로 자동 스위칭.
- **현재는 배치가 MariaDB 를 읽어 `mart_list_reservation_homepage` 에 적재하고, 앱은 마트를 조회한다.**
  조회 시점 원본 직결은 더 이상 표준 경로가 아니다.
- 커밋 저자의 판단대로 됐다: "실증용. **운영 실시간이 필요하면 마트 ETL 쪽이 맞다**."

---

## 1. 대상 시스템

### 1-1. 소스 DB

- 종류: **MariaDB** (레거시 PHP 홈페이지 `bnviit-homepage-admin-rebuild` 의 운영 DB)
- 호스트: `192.168.200.32:3306` (내부망)
- DB / 계정: `bseyecom_db` / `bseyecom_user` (읽기 전용)
- 접근: SSH 터널 경유(사이드카 · 앱 밖). 앱은 `localhost:<터널포트>` 로 붙는다.

### 1-2. 대상 테이블 · 컬럼

테이블: `TBL_COUNSEL` (7개 상담 채널을 한 테이블에 담음)
필터: `CATEGORY='COUNSELONLINE'` (온라인 예약만) · `DEL_TF='N'` (삭제 제외)

컬럼 매핑 — 원본(MariaDB, UPPER_CASE) ↔ SQLite 캐시(snake_case) ↔ API 별칭(camelCase):

| MariaDB 원본 | SQLite 캐시 | API 별칭 | 비고 |
|---|---|---|---|
| `C_NO` (int) | `legacy_no` | `legacyNo` | PK. MariaDB는 CAST AS CHAR 필요 |
| `DIVICE_TYPE` | `device_type` | `deviceType` | **원본 오타 그대로** |
| `M_NM` | `name` | `name` | |
| `M_PHONE` | `phone` | `phone` | |
| `RESERVE_DATE` | `reserve_date` | `reserveDate` | 예약 희망일 |
| `RESERVE_TIME` | `reserve_time` | `reserveTime` | |
| `UTM_SOURCE/MEDIUM/CAMPAIGN` | `utm_*` | `utmSource/Medium/Campaign` | 유입 트래킹 |
| `REFERRAL_CODE` | `referral_code` | `referralCode` | |
| `EXAM_TYPE` | `exam_type` | `examType` | 시력교정=5, 백내장=2, 노안=21, 렌즈=24/25 |
| `SURGERY_TF` | `surgery_tf` | `surgeryTf` | 당일수술 여부 |
| `ISRESERVE` | `is_reserve` | `isReserve` | |
| `REG_DATE` (datetime) | `reg_date` (TEXT) | `regDate` | MariaDB는 DATE_FORMAT 로 문자열화 필요 |

---

## 2. 1단계 구현 — 직결 조회 (b61ff05)

### 2-1. 데이터소스 구조

```
                  LEGACY_DATASOURCE_URL
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
     jdbc:sqlite:*               jdbc:mariadb://*
              │                       │
     LegacyDialect.SQLITE     LegacyDialect.MARIADB
     driver=org.sqlite.JDBC   driver=org.mariadb.jdbc.Driver
     sqlDir="sqlite"          sqlDir="mariadb"
     live()=false             live()=true
              │                       │
              └───────────┬───────────┘
                          ▼
                Hikari (pool=2, readOnly, 5s timeout)
                          │
                          ▼
                legacyJdbcTemplate (Bean)
                          │
                          ▼
                ReservationListHomepageRepository
                          │
                          ▼
                컨트롤러 → 앱 응답
```

### 2-2. 핵심 파일

> ⚠️ 아래 파일·환경변수 이름은 **2026-07-15 당시**의 것이다. 현행 이름은 문서 상단 박스 참조
> (`LegacyDialect` → `HomepageSourceDialect`, `LegacyDataSourceConfig` → `HomepageDataSourceConfig`,
> `LEGACY_DATASOURCE_URL` → `HOMEPAGE_DATASOURCE_URL`).

| 역할 | 파일 (현행 이름) |
|---|---|
| 판별 enum | `common/config/HomepageSourceDialect.java` |
| DS 설정 | `common/config/HomepageDataSourceConfig.java` |
| Repository | `reservation/repository/ReservationListHomepageRepository.java` |
| Service | `reservation/service/ReservationListHomepageService.java` |
| Controller | `reservation/controller/ReservationListHomepageController.java` |
| SQLite SQL | `sql/homepage/sqlite/*.sql` (3개) |
| MariaDB SQL | `sql/homepage/mariadb/*.sql` (3개) |

### 2-3. 설계 결정

**결정 1. URL 접두사가 방언·드라이버·live 여부를 모두 결정한다**
- 별도 `legacy.dialect` 설정 키를 두지 않는다. `jdbc:mariadb + dialect=sqlite` 같은 모순 조합을 만들 여지를 없앤다.
- 미지 접두사는 `SQLITE` 로 폴백 (실시간으로 오인해 경고를 끄는 것보다 안전).

**결정 2. SQL 을 방언별 두 세트로 분리한다**
- 캐시가 원본을 snake_case 로 개명해 적재했기 때문(`C_NO→legacy_no`, `M_NM→name`, `DIVICE_TYPE→device_type` 등).
- 스냅샷 SQL 을 원본 DB 에 그대로 쓰면 `no such column` 이 난다.
- 결과 별칭 계약(14개)은 양쪽이 동일해야 하며 `ReservationListHomepageSqlResourceTest` 가 강제.

**결정 3. `LEGACY_DATASOURCE_URL` 이 비면 관련 빈이 통째로 안 뜬다**
- `@ConditionalOnProperty` 대신 SpEL `@ConditionalOnExpression("!'${legacy.datasource.url:}'.trim().isEmpty()")` 사용.
- `@ConditionalOnProperty` 는 빈 문자열도 "존재함"으로 봐서 500 이 남 → SpEL 로 공백까지 꺼짐 처리.
- 결과: URL 비어 있으면 `/api/reservation-list-homepage` 만 503, 앱은 정상 기동.

**결정 4. `live` 플래그로 프론트 경고 배너 자동 억제**
- 스냅샷 모드: `lastRegDate` 는 "이 시점 이후는 조용히 빈다" 라는 천장 → 조회 기간이 그 이후면 경고 배너.
- 실시간 모드: `lastRegDate` 는 그냥 최근 등록건 시각 → 미래 조회할 때마다 거짓 경고 나오지 않도록 `live=true` 응답으로 배너 자동 억제, 대신 신선도 표시.

**결정 5. 명명 정리 — `snapshotMaxRegDate` → `lastRegDate`**
- 실시간에서는 "스냅샷"이 아니라 이름이 사실과 어긋난다. DTO·zod·훅·페이지·SQL 별칭·SQL 파일명 일괄 정리.

**결정 6. MariaDB 타입 함정 처리**
- `C_NO` int → `CAST(C_NO AS CHAR)` — 프론트 zod가 `z.string()` 강제.
- `REG_DATE` datetime → `DATE_FORMAT(..., '%Y-%m-%d %H:%i:%s')` — 없이 두면 JDBC가 `Timestamp` 를 올려 zod 파싱 깨짐.

### 2-4. 회귀 검증

**기준값: `from=2026-06-01` / `to=2026-06-30` → 206건.** 운영 화면 동일 조건과 같은 값이다.

- 소스가 SQLite → MariaDB 로 바뀌어도 206 으로 동일했다(SQL 재작성이 정확하다는 증거).
- `2026-07-11 ~ 2026-07-15 → 34건`. 스냅샷이면 0건인 구간 = 실시간 동작 증거 (스냅샷은 2026-07-10 16:15:55 고정).
- 응답 계약: `{rows, lastRegDate, live}` · `live=true` · `lastRegDate=2026-07-15 15:22:57`.

**숫자가 틀리면 아래를 의심할 것** — 증상별로 원인이 갈린다.

| 증상 | 원인 |
|---|---|
| **753건** | `category='COUNSELONLINE'` 필터 누락 (다른 상담 채널이 섞임) |
| **199건** | 종료일 반개구간 누락 → 종료일 당일이 통째로 빠짐 |
| 7월 조회가 적음 | 스냅샷 범위 초과 (정상. 경고 배너 확인) |

`ReservationListHomepageSqlResourceTest` 가 SQL 형태를, `ReservationListHomepagePage.test.tsx` 가
화면 동작을 고정한다.

### 2-5. 알려진 한계 — 커밋 저자 명시

인용 (b61ff05 커밋 메시지):
> 터널 구성(사이드카)은 docker-compose.override.yml(gitignored)에 있다. 로컬 실증용이며 **운영에 이 구조를 쓰지 말 것** — 터널이 끊기면 이 메뉴만 503 이고 상시성 보장 주체가 없다. **운영 실시간이 필요하면 마트 ETL 쪽이 맞다.**
> H2 콘솔이 켜져 있으면 레거시 DataSource 도 목록에 올라온다. 실시간 + H2 콘솔 ON 조합을 운영에 올리지 말 것.

### 2-6. ⚠️ `DefaultDataSourceConfig` — 지우지 말 것

`common/config/DefaultDataSourceConfig.java` 는 **버그 수정**이다. 없으면 H2 프로파일에서 기동이 깨진다.

- 원래 H2(프로파일 미지정)에서는 Spring Boot 의 `DataSourceAutoConfiguration` 이 primary DataSource 를 만들어줬다.
- 그 auto-config 는 `@ConditionalOnMissingBean(DataSource.class)` — **DataSource 빈이 하나라도 생기면 통째로 물러난다.**
- 홈페이지 DataSource 가 켜지자 SQLite 가 유일한 DataSource 가 되어 JPA 가 그걸 집어들고
  `Unable to determine Dialect for SQLite 3.47` 로 기동 실패했다.
- 그래서 `postgres-mart` 프로파일과 동일하게 primary 를 명시했다.

### 2-7. 화면 — 레거시와 의도적으로 다르게 만든 부분

레거시 관리자 화면 `counsel/online_list.php` 를 **조회 전용**으로 이관하면서 바꾼 것:

| 항목 | 결정 |
|---|---|
| 삭제·체크박스 | **제외** — 조회 전용. 쓰기 액션은 옮기지 않았다 |
| CSV 내보내기 | **제공** — 다른 리스트 화면과 동일. 개인정보가 원문으로 나가는 점 유의 |
| 검색 | 이름·**휴대폰번호** 통합 단일 입력. 레거시는 휴대폰 검색이 안 돼 운영 불편이 있었다 |
| 개인정보 | **원문 그대로** 표시(레거시 화면과 동일). 마스킹 안 함 |
| 스냅샷 경고 배너 | 신규 추가 — 레거시엔 없다. 실시간 소스면 초록 "실시간" 표시로 대체 |
| 필터 UI | 레거시 4블록 라디오 폼 대신 대시보드 리스트 공통 툴바 |
| 필터 적용 시점 | 구분·예약구분·검색은 **즉시 반영**(클라 필터). `조회` 는 등록일 재조회 전용 |

**레거시 동작을 그대로 따른 부분** — 바꾸면 건수가 틀어진다:

- `del_tf='N'` 하드코딩 — 삭제건(281건)은 조회 대상 아님
- `ORDER BY legacy_no DESC` — 등록일이 아니라 PK 역순
- `No` 는 **총건수에서 1씩 감소**하는 표시용 번호(저장값 아님, 식별자는 `legacyNo`)
- `진료구분=1`(59건)은 레거시에도 라벨이 없어 **빈칸**

> ⚠️ **스냅샷일 때 조용한 실패 주의** — 조회 기간이 스냅샷을 넘으면 에러 없이 **건수가 모자라게** 나온다.
> 화면이 `lastRegDate` 비교로 경고 배너를 띄운다. **이 동작을 지우지 말 것.**
> 실시간에서는 천장이 없어 같은 비교가 거짓 경고가 되므로 `live` 플래그로만 끈다 — 배너 자체를 지우면 안 된다.

---

## 3. 2단계 — 마트 배치 이관 ✅ **완료** (아래는 당시 계획서 원문)

### 3-1. 목표 구조

```
MariaDB TBL_COUNSEL (원본, 배치 노드에서만 접근)
        │
        │  ReservationListHomepageMartJob (03:00 KST, 인트라데이 10:00)
        ▼
mart_list_reservation_homepage (Postgres)
        │
        │  SELECT
        ▼
ReservationListHomepageRepository (앱)
        │
        ▼
API → 프론트
```

### 3-2. 다른 마트와의 정렬

- 표준 마트 패턴(예약통계·수술·검사 등)과 동일한 구조.
- 앱은 **마트만** 조회. MariaDB 접속은 배치 노드에만 국한.
- SSH 터널 상시성은 배치 시점(하루 1~2회 · 짧게)만 필요 → 상시 운영 부담 해소.
- `strategy.md` §11-6 "새 메뉴 추가 표준" 절차와 일치.

### 3-3. 구현 스케치

**신규 마트 테이블** (실제 파일명: `sql/mart/V21__mart_list_reservation_homepage.sql`)
```sql
CREATE TABLE mart_list_reservation_homepage (
    legacy_no        INTEGER PRIMARY KEY,
    device_type      VARCHAR(32),
    name             VARCHAR(64),
    phone            VARCHAR(32),
    reserve_date     VARCHAR(16),
    reserve_time     VARCHAR(16),
    utm_source       VARCHAR(64),
    utm_medium       VARCHAR(64),
    utm_campaign     VARCHAR(128),
    referral_code    VARCHAR(32),
    exam_type        VARCHAR(8),
    surgery_tf       CHAR(1),
    is_reserve       VARCHAR(8),
    reg_date         VARCHAR(23),
    loaded_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_mart_list_reservation_homepage_reg_date
    ON mart_list_reservation_homepage (reg_date);
```

**신규 배치 잡** (`batch/job/ReservationListHomepageMartJob.java`)
- 리스트형 마트 패턴 (`list_reservation` · `list_cataract_exam` 참고): `DELETE ... WHERE reg_date BETWEEN :from AND :to` → `INSERT`.
- 소스: `HomepageCounselRepository` (b61ff05 의 mariadb SQL 을 재활용).
- 스케줄: `BatchOrchestrator.runDaily` 에 배선.

**앱 조회 경로 리팩터**
- `ReservationListHomepageRepository` — Postgres 마트에서 조회하도록 재작성.
- 방언 분기(`sqlite/` vs `mariadb/`) 제거. 마트 SQL 한 세트만 남김.
- `@ConditionalOnExpression(legacy.datasource.url)` 제거 — `@Profile("postgres-mart")` 로 대체.
- `ReservationOverallStatsService` 의 `Optional<homepageRepository>` · `orElseThrow` 도 제거 (마트 항상 존재).

### 3-4. 결정 필요 사항

이관 실행 전 확정해야 하는 것들:

1. **직결 지원을 제거할지 유지할지** — 마트만 남기고 SQLite/MariaDB 직결 코드는 지울지, 로컬 개발용으로 남길지.
2. **배치 노드의 MariaDB 접근 경로** — 상시 SSH 터널이 없다면 배치 시점에만 터널 열기, 아니면 사내망 라우팅 요청.
3. **naver/kakao 도 마트로 옮길지** — 현재는 MSSQL 직결 유지 결정(D1). 홈페이지만 마트로 가면 되나, 아니면 세 채널 모두 마트로 통합할지.

---

## 4. 운영 체크리스트

### 4-1. 1단계 유지 시 (직결)

- [ ] SSH 터널 상시성 보장 (autossh · systemd · docker sidecar 중 택 1)
- [ ] 터널 끊김 감지 → 알림 파이프라인 연결
- [ ] `LEGACY_DATASOURCE_URL` 을 배포 파이프라인 secret 으로 관리
- [ ] H2 콘솔은 `false` 로 고정 (`APP_H2_CONSOLE_ENABLED=false`)
- [ ] `docker-compose.override.yml` 은 로컬 전용 (gitignored) — 운영엔 다른 방식 사용

### 4-2. 2단계 이관 — ✅ 완료분

- [x] `V21__mart_list_reservation_homepage.sql` 작성 · `MartSchemaInitializer` 등록
- [x] `ReservationListHomepageMartJob` · `Writer` 추가 · `BatchOrchestrator` 배선 (RESERVATION 도메인 **최선두**)
- [x] MariaDB SELECT SQL 을 배치용으로 재작성
- [x] `ReservationListHomepageRepository` 를 마트 조회로 전환
- [x] 환경변수·클래스 개명 (`LEGACY_*` → `HOMEPAGE_*`)
- [ ] **직결 잔재 정리 미결** — SQLite/MariaDB 두 SQL 세트를 로컬 개발용으로 남길지 미정 (§3-4 결정 1)
- [ ] 홈페이지 몫 재계산 후 `mart_reservation_overall_monthly.online` 일치 확인

---

## 5. 온라인 예약 공식 (2026-06~) — 이 소스를 쓰는 이유

> 구 `2026-07-15-예약자리스트_홈페이지-추가.md` §9 에서 옮겨왔다.
> 이 화면이 단순 조회용이 아니라 **월간 레포트·예약 종합의 입력**이라는 점이 핵심이다.

대상: `report/monthly#c-reservation-online` 차트.

```
2024·2025    : 온라인 = RESERVE_PATH ONLINE/APP(홈페이지) + NAVER(네이버)   ← 카카오 미포함 · V12 시드
2026-01 ~ 05 : V24 골든 시드 (담당자 확정값 — 배치 write 차단)
2026-06 ~    : 온라인 = 네이버(RSS 기준) + 카카오톡(해피톡) + 홈페이지(리스트 화면과 동일한 raw)
               종합   = 콜 + 새 온라인
```

**2024·2025 는 안 건드린다**(V12 시드 + `min-year` 가드). **2026-01~05 도 V24 골든 시드로 고정**이라
이 5개월은 예약통계 셀 오버라이드가 예약 종합·월간 레포트에 반영되지 않는다.
**2026-06 부터 정의가 바뀐다** — 연도 비교 시 주의.

### 5-1. 구성요소 3개 (서로 다른 DB)

| 구성요소 | 소스 | SQL | 기준 |
|---|---|---|---|
| 네이버 | MSSQL `RESERVATION` | `reservation-overall/monthly-naver.sql` | RSS 의 '네이버 예약수'(CH16)와 동일 — **취소 제외, 정크제외 미적용** |
| 카카오톡 | MSSQL `HappyTalk_*` | `reservation-overall/monthly-kakao.sql` | RSS 의 CH18 — `수술전`+`★신환`, 밀리초 dedup |
| 홈페이지 | **이 문서의 소스** | `reservation-list-homepage/select-monthly-list-raw.sql` | 리스트 화면과 동일 — `EXAM_TYPE` 필터 없음, `COUNT(*)` (전 진료) |

**세 소스가 서로 다른 DB라 SQL 조인이 불가능하다** → 합산은 `ReservationOverallStatsService` 에서 한다.

### 5-2. 알아둘 것

- **네이버 값은 기존 종합의 NAVER 집계와 일부러 다르다.** RSS 는 취소를 빼고 정크필터를 안 쓴다.
  두 화면(월간 레포트 / 예약통계_시력교정)이 같은 숫자를 말하게 하는 게 이 정의의 전제다. **맞추려 하지 말 것.**
- **카카오는 원래 의도적으로 빠져 있었다.** 사유는 "레거시 RSS 가 월마다 포함/미포함이 들쭉날쭉"이었고,
  이제 마트가 직접 계산하므로 포함한다. 영향은 월 9~16건(1~3%).
- **백내장은 원래도 안 들어왔다.** 종합/네이버는 `RESERVE_FLAG='M'`(시력교정)으로 이미 걸러진다.
  ※ 홈페이지 백내장은 **2025-02 이후 0건**이라 최근 구간에서 이 필터는 미상 코드 `1` 만 걸러낸다.
- **온전히 담지 못한 달은 `null`** — 0 으로 더하면 '조용히 작은 온라인 예약'이 된다.
  판정(`coverageMonth`)은 소스와 무관하게 같다: **말일까지 담긴 달만 인정**한다.
  단 2026-07 부터 **진행 중인 달은 부분값이라도 노출**하도록 완화됐다(커밋 `ceca8a0`).
- **차트 라벨** `온라인 예약 (네이버·카카오·홈페이지)` 는 2026-06 부터 사실이 된다.
  24·25 구간엔 카카오가 없어 라벨이 여전히 부정확하다 — 정의 전환 시점 표기를 붙일지 검토 필요.

### 5-3. 2026-07-24 이력

1. 홈페이지 몫을 `exam_type='5'` + `COUNT(DISTINCT phone)` 에서 **리스트 화면과 동일한 raw**
   (전 진료 · `COUNT(*)`) 로 통일 — 예약 종합·월간 레포트·예약자 리스트_홈페이지 **세 화면이 같은
   홈페이지 건수**를 참조하도록 정합.
2. 오전에 컷오버를 2026-06 → 2026-01 로 앞당겼다가, 오후에 다시 2026-06 으로 복원.
   2026-01~05 는 V24 골든 시드로 못 박기로 결정.

### 5-4. 반영 절차 · 검증 한계

공식만 고쳐선 값이 안 바뀐다. **배치를 2026 구간에 재실행**해야 마트가 갱신된다
(`BatchAdminController` / `ReservationReconcileService`). 읽기 SQL·DDL 은 변경 없음.

> ⚠️ **네이버·카카오 실측 미완.** SQL 형태와 합산 규칙만 테스트로 고정돼 있다
> (`ReservationOverallSqlResourceTest`, `ReservationOverallStatsServiceTest`).
> 홈페이지 월별 값만 실측했다(2026-06 → 202건).
> **MSSQL 접속은 가능하므로** `monthly-naver.sql`·`monthly-kakao.sql` 을 prod 에 직접 돌려
> 예약통계_시력교정 화면 수치와 대조할 수 있다. **공식 변경의 핵심인데 이 부분만 미검증이다.**

---

## 6. FAQ

**Q. MariaDB 직결이 이미 있는데 왜 마트로 또 가야 하나요?**
A. 커밋 저자가 실증용으로 명시한 상태입니다. 앱이 매 요청마다 SSH 터널로 원격 DB에 붙는 구조는 (1) 터널 상시성 부담, (2) 원본 DB에 부하 전가, (3) 다른 도메인(mart_reservation_overall_monthly 등)과 계산 축이 어긋남 문제가 있습니다. 마트로 가면 이 셋 다 해소됩니다.

**Q. SQLite 스냅샷 방식은 왜 유지하고 있나요?**
A. 자격증명·터널 없이 동작해야 하는 환경(신규 개발자 온보딩, 오프라인 데모)이 있다는 것이 커밋 저자의 판단. 마트 이관이 완료되면 이것도 함께 제거 검토.

**Q. 배치 이관하면 실시간성이 사라지는 것 아닌가요?**
A. 네. 다만 이 화면은 등록일 기준 조회이고 T-1 신선도로도 실무 요구는 충족한다는 것이 대시보드의 기본 정책(strategy.md §2 결정 2 참조). 실시간이 반드시 필요한 특별 요건이 있다면 예외 처리 검토.

**Q. `DIVICE_TYPE` 오타는 어디서 왔나요?**
A. 원본 `TBL_COUNSEL` 컬럼명이 오타 상태로 굳어 있습니다. 대시보드 코드에서 수정하면 원본 스키마와 어긋나므로 그대로 씁니다. 별칭 단계(`AS deviceType`)에서 사용자에게 보이는 이름은 정정됩니다.

---

## 참조

- **이 문서가 정본이다.** 구 `docs/2026-07-15-예약자리스트_홈페이지-추가.md`(초기 SQLite 도입 +
  온라인 예약 공식 변경)는 2026-08-05 에 이 문서로 흡수하고 삭제했다.
- 관련 커밋: `212ea93`(SQLite 스냅샷 도입) · `b61ff05`(MariaDB 직결) · `ceca8a0`(진행월 부분값 노출)
- 배치 전략·실행 규칙·마트↔메뉴 매핑(정본): [`strategy.md`](./strategy.md) — 실행 규칙 §12-2-1·§12-4-2
- 빌드 사전 조건(Nexus 계정)·환경변수: [`../deployment.md`](../deployment.md) §2
- 두 화면의 홈페이지 예약수가 다른 이유: [`../점검/홈페이지-CRM-예약수-비교_2026-07.md`](../점검/홈페이지-CRM-예약수-비교_2026-07.md)
