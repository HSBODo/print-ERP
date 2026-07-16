# 예약자 리스트_홈페이지 소스 접근 전략

> 작성일: 2026-07-15
> 상태: **1단계 완료** (SQLite/MariaDB 직결) · **2단계 미착수** (마트 배치 이관)
> 관련 커밋: `212ea93` (초기 SQLite 스냅샷 도입) · `b61ff05` (MariaDB 직결 추가, 2026-07-15)
> 배경 문서: [`strategy.md`](./strategy.md) · [`mart-menu-mapping.md`](./mart-menu-mapping.md)

---

## 0. TL;DR

- 홈페이지 온라인 예약 데이터는 대시보드 DB(Postgres·MSSQL)와 **다른 시스템**(레거시 홈페이지 MariaDB `bseyecom_db.TBL_COUNSEL`).
- 현재 구현: `LEGACY_DATASOURCE_URL` 하나로 SQLite 스냅샷 / MariaDB 직결을 URL 접두사로 자동 스위칭.
- **앱이 조회 시점에 원본 DB를 직접 쿼리** — 아직 마트 배치 경유 아님.
- 커밋 저자도 명시: "실증용. **운영 실시간이 필요하면 마트 ETL 쪽이 맞다**."
- 다음 단계 계획: MariaDB → 배치 → `mart_list_reservation_homepage` → 앱은 마트만 조회 (표준 마트 패턴 정렬).

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

| 역할 | 파일 |
|---|---|
| 판별 enum | `common/config/LegacyDialect.java` |
| DS 설정 | `common/config/LegacyDataSourceConfig.java` |
| Repository | `reservation/repository/ReservationListHomepageRepository.java` |
| Service | `reservation/service/ReservationListHomepageService.java` |
| Controller | `reservation/controller/ReservationListHomepageController.java` |
| SQLite SQL | `sql/reservation-list-homepage/sqlite/*.sql` (3개) |
| MariaDB SQL | `sql/reservation-list-homepage/mariadb/*.sql` (3개) |

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

- `2026-06-01 ~ 2026-06-30 → 206건`. 소스가 SQLite → MariaDB 로 바뀌어도 동일.
- `2026-07-11 ~ 2026-07-15 → 34건`. 스냅샷이면 0건인 구간 = 실시간 동작 증거 (스냅샷은 2026-07-10 16:15:55 고정).
- 응답 계약: `{rows, lastRegDate, live}` · `live=true` · `lastRegDate=2026-07-15 15:22:57`.

### 2-5. 알려진 한계 — 커밋 저자 명시

인용 (b61ff05 커밋 메시지):
> 터널 구성(사이드카)은 docker-compose.override.yml(gitignored)에 있다. 로컬 실증용이며 **운영에 이 구조를 쓰지 말 것** — 터널이 끊기면 이 메뉴만 503 이고 상시성 보장 주체가 없다. **운영 실시간이 필요하면 마트 ETL 쪽이 맞다.**
> H2 콘솔이 켜져 있으면 레거시 DataSource 도 목록에 올라온다. 실시간 + H2 콘솔 ON 조합을 운영에 올리지 말 것.

---

## 3. 2단계 계획 — 마트 배치 이관 (미착수)

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
- `docs/databatch/mart-menu-mapping.md` §6 "새 메뉴 추가 표준" 절차와 일치.

### 3-3. 구현 스케치

**신규 마트 테이블** (`sql/mart/V21__reservation_list_homepage_mart.sql`)
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
- 스케줄: `BatchOrchestrator.runDaily` · `runReservationStatsIntraday` 에 배선.

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

### 4-2. 2단계 이관 시 (마트)

- [ ] `V21__reservation_list_homepage_mart.sql` 작성 · `MartSchemaInitializer` 등록
- [ ] `ReservationListHomepageMartJob` · `Writer` 추가 · `BatchOrchestrator` 배선
- [ ] MariaDB SELECT SQL 을 배치용으로 재작성 (기간 파라미터 반개구간)
- [ ] `ReservationListHomepageRepository` 를 마트 조회로 전환
- [ ] `ReservationOverallStatsService` 에서 `Optional<>` · `orElseThrow` 제거
- [ ] `legacy.datasource.url` 관련 조건 · SQL 두 세트 등 직결 잔재 정리
- [ ] 회귀 테스트: 2026-06 → 206건 유지 검증
- [ ] 홈페이지 몫 재계산 후 `mart_reservation_overall_monthly.online` 일치 확인

---

## 5. FAQ

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

- 초기 SQLite 도입 문서: `2026-07-15-예약자리스트_홈페이지-추가.md`
- MariaDB 직결 커밋: `b61ff05`
- 배치 전략 원문: [`strategy.md`](./strategy.md)
- 마트-메뉴 매핑: [`mart-menu-mapping.md`](./mart-menu-mapping.md)
