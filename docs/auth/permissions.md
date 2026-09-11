# 권한 정책 — Role × Department 2축 모델

> 작성일: 2026-09-02 · 상태: **스펙 확정 · 착수 완료 (2026-09-03)**
> 목적: 현재 2단계 롤(`ADMIN`/`USER`) 을 4단계 롤(ADMIN·DIRECTOR·MANAGER·STAFF) + 부서 2종(MEDICAL·MARKETING) + org-less 표식(`ALL`) 으로 재정리.
> 참고: 이 축은 "부서(department)" 이며, 향후 "소속(회사·법인)" 축은 별도 필드로 추가 예정.
>
> 📌 관련 문서
> - SMS 관리자 권한 정책: `docs/sms/strategy.md` § 5-2
> - 배치 관리자 API: `docs/databatch/strategy.md`
> - 페이지 정의: `frontend/src/config/statsPages.ts` · `frontend/src/config/navigation.ts`
> - 보안 매처: `backend/src/main/java/com/bviit/analytics/auth/config/SecurityConfig.java`

---

## 1. 배경 · 왜 재정의하는가

### 지금까지의 구조
- **롤 2단계**: `Role` enum = `ADMIN` / `USER` (`Role.java`)
- **백엔드 gate**: `/api/admin/**` · `/api/sms-management/**` → `hasRole('ADMIN')`, 나머지 → `authenticated()`
- **프론트 gate**: `adminOnly`(사이드바 숨김·라우트 차단) · `adminReal`(배지 구분) · 개별 조작에 `role !== 'ADMIN'` 판정 흩뿌림

### 왜 부족한가
1. **부서(마케팅) 접근을 표현할 축이 없다** — 마케팅 부서 사용자가 마케팅 지표만 봐야 할 때, 지금 구조로는 "ADMIN 만 노출" 이라는 단일 축밖에 없어 처리 못 함.
2. **미래의 MANAGER 확장 여지가 없다** — 예산·목표·데이터 export 등 실장·본부장급 조작은 지금 ADMIN 을 부여할 수도, USER 로 놓을 수도 애매.
3. **개별 판정 흩어짐** — SMS 페이지 안 `role !== 'ADMIN'` 이 여러 조작 지점에 분산. 완화 계획(§ SMS strategy.md 5-2) 실행 시 손댈 자리가 많음.

---

## 2. 결정된 구조

### 2-1. Role tier (동사 축 — 무엇을 할 수 있나)

| 롤 | 의미 | 지금 실권한 |
|---|---|---|
| **ADMIN** | 정책·시스템 관리 (개발자 전용) | 오프셋 편집 · SMS [지금 실행] · 배치 재실행 · 사용자·롤 부여 |
| **DIRECTOR** | 임원·경영진 (전 그룹 데이터 열람) | STAFF 수준 조작. 시스템 조작(배치·SMS·오프셋·사용자 부여) 은 불가. 데이터는 두 org 전체 열람. |
| **MANAGER** | 조직 의사결정 (**개념상 자리만**) | STAFF 와 동일. 향후 경영 KPI export · 예산·목표 편집 등 분리 예정 |
| **STAFF** | 실무 조작 | 리스트 조회 · 홀딩·수신거부 · 연락처 수정 · 수동 대상 추가 (= 지금 `USER`) |

**의도적으로 뺀 것**: `VIEWER`. 실제 사용 케이스 없어 처음엔 4단계로 시작. 나중에 외부 열람 요청이 오면 그때 추가.

**MANAGER ≡ STAFF (지금)** — 권한 완전 동일. Role enum 에 자리만 만들고 hasAnyRole 로 묶어 취급. 향후 MANAGER 전용 조작이 생길 때 gating 을 하나씩 옮김.

**DIRECTOR 위치** — ADMIN 과 MANAGER 사이. 조작 권한은 STAFF 와 같지만 **org 스코프가 없다**(두 그룹 전부 열람). 원장·임원·본부장급이 마케팅 지표까지 봐야 할 때 부여.

### 2-2. Department (명사 축 — 어떤 데이터를 볼 수 있나)

**대칭 구조** — 각 부서는 자기 그룹 메뉴만 본다. 서로 상대 그룹은 안 보임.

| 부서 (`department`) | 접근 스코프 |
|---|---|
| **ALL** (ADMIN·DIRECTOR 전용) | **전체** — 메디컬 그룹 + 마케팅 그룹 모두. 부서 gate 우회. |
| **MEDICAL** | 홈화면 + 메디컬 그룹 (예약·검사·수술·전환·외래·리포트·기타·관리자) |
| **MARKETING** | 홈화면 + 마케팅 그룹 (channel-profit·marketing) + 해외마케팅 섹션 (overseas-marketing-receptions·overseas-marketing-statistics·overseas-reservation-stats) |

**ADMIN·DIRECTOR 는 부서 축을 벗어난다** — 두 롤 모두 `User.department = ALL`. 차이는 조작 권한에 있음: ADMIN 은 시스템 조작 가능, DIRECTOR 는 STAFF 수준 조작만.

**MEDICAL × MARKETING 대칭** — MANAGER/STAFF 는 상대 그룹이 사이드바에 뜨지 않고 직접 URL 접근도 차단(`isRouteBlocked` 부서 gate). 두 그룹 다 보려면 DIRECTOR 이상이 필요.

**부서 vs 소속(회사)** — 이 축은 "부서(department)" 다. 향후 관계사·법인 등 "소속" 축이 별도로 추가될 수 있어 이름을 분리해 둔다.

**내부 부서**임을 전제 — 외주가 아니므로 인프라급 격리(IP 화이트리스트·별도 도메인 등) 는 하지 않음. 페이지·API 노출만 조절.

### 2-3. 조합 매트릭스

| Role \ Department | ALL | MEDICAL | MARKETING |
|---|---|---|---|
| ADMIN | ✅ **개발자 전용** (전권 · 전 그룹) | 🚫 CHECK 제약 위반 | 🚫 CHECK 제약 위반 |
| DIRECTOR | ✅ **임원·경영진** (전 그룹 열람 · 시스템 조작 X) | 🚫 CHECK 제약 위반 | 🚫 CHECK 제약 위반 |
| MANAGER | 🚫 CHECK 제약 위반 | ✅ 실장·본부장 | ✅ 마케팅 팀장 |
| STAFF | 🚫 CHECK 제약 위반 | ✅ 상담사·간호사 · 원장 | ✅ 마케팅 실무자 |

**핵심 제약** (DB CHECK `users_role_department_scope_ck` 로 강제):
- **ADMIN·DIRECTOR ↔ `department = 'ALL'`** — 두 롤 모두 두 그룹 전부 접근.
  - ADMIN: 시스템 조작 가능 (개발자 전용)
  - DIRECTOR: STAFF 수준 조작만 (임원·경영진)
- **MANAGER·STAFF ↔ `department ∈ ('MEDICAL','MARKETING')`** — 반드시 부서 값을 가진다.
- 마케팅 부서의 최고 등급은 MANAGER (마케팅에는 ADMIN·DIRECTOR 없음 — 두 롤은 조직 전체를 보는 자리라 부서와 배타적).

---

## 3. 판정 두 층으로 나뉜다

```
접근 요청
  │
  ├─ 0층 부서 우회 — user.department == 'ALL' (ADMIN·DIRECTOR) 이면 부서 gate 통과
  │
  ├─ 1층 Department gate — "이 페이지·API 는 네 부서에 열려 있나?" (MANAGER/STAFF)
  │    · /                                             → 스코프 없음 (공통 홈)
  │    · /stats/channel-profit, /stats/marketing,
  │      /stats/overseas-marketing/*, /stats/reservation-channel,
  │      /stats/channel-analysis, /stats/accumulated-eyes
  │                                                    → MARKETING only
  │    · /stats/exam-list, /report/*, /admin/*, 그 외 모든 통계
  │                                                    → MEDICAL only
  │
  └─ 2층 Role gate — "네 롤이 이 조작을 할 수 있나?"
       · GET  /offsets, /targets            → STAFF 이상 (DIRECTOR 포함)
       · PUT  /offsets, POST /queue/run     → ADMIN only (canSystemOp 헬퍼)
       · POST /admin/batch/**               → ADMIN only
```

**두 층을 섞지 않는 이유** — 페이지 추가 시 부서 태그만 붙이면 되고, 롤 조작이 늘어나도 부서 태그를 다시 안 건드림. 지금처럼 판정이 개별 컴포넌트에 흩뿌려지지 않는다.

**ADMIN·DIRECTOR 가 부서 gate 를 우회하는 이유** — 두 롤은 조직 전체 열람이 정의상 필요하다. 구현상 `user.department === 'ALL'` 이면 모든 부서 태그를 통과시키는 방식(`matchesDepartment` 헬퍼) 으로 처리 — 롤이 아니라 department 값으로 판정한다.

**Role gate 에서 ADMIN vs DIRECTOR 구분** — 시스템 조작(오프셋 편집·SMS 지금 실행·배치 재실행·사용자 부여) 은 `canSystemOp(user) ≡ role === 'ADMIN'` 로 좁힌다. 조회·리스트·홀딩·수신거부 등 STAFF 조작은 authenticated 만 요구.

---

## 4. 페이지·API 매핑

### 4-1. 페이지 부서 매핑 (`getPageDepartments`)

판정은 `navigation.ts` 의 `MARKETING_ONLY_PAGE_IDS` Set 하나로 갈린다. 마케팅 전용이 아닌 페이지는 모두 `MEDICAL` 기본값. ADMIN·DIRECTOR (`department='ALL'`) 는 부서 gate 를 우회한다.

| 그룹 | 페이지 | department |
|---|---|---|
| — | 홈화면 `/` | 스코프 없음 (통계 페이지 아님) |
| **마케팅** | reservation-channel · channel-profit · channel-analysis · accumulated-eyes · marketing · **sms** | **MARKETING** (MEDICAL 도 접근 X) |
| **해외마케팅** | overseas-marketing-receptions · overseas-marketing-statistics · overseas-reservation-stats (2026-09-09 이관 · 별도 최상위 섹션) | **MARKETING** (MEDICAL 도 접근 X) |
| 예약 | reservation-list · reservation-overall · reservation-stats-system · reservation-stats-cataract · reservation-list-homepage · (reservation) | MEDICAL |
| 검사 | overall-exam · overall-exam-weekly · exam-list · cataract-exam-list · all-exam-list · eoeis-checkup · examination · procedure-exam | MEDICAL |
| 전환&성공률 | consultation-rate · cataract-reservation-rate · stop-rate · stop-reason | MEDICAL |
| 수술 | surgery-list · surgery · surgery-ratio · surgery-composition | MEDICAL |
| 외래 | outpatient-list · outpatient-count | MEDICAL |
| Report | weekly-report · monthly-report | MEDICAL |
| 기타 | dreamlens-revenue · b2b-revenue · (그 외 미구현 8종) | MEDICAL |
| 관리자 | batch-management · **account-management** | ADMIN 전용 (부서 무관 · 개발자 전용) — DIRECTOR 도 진입 불가 |

**SMS 는 § 5-2 완화 후 MARKETING 부서 전용**(2026-09-03 사용자 결정) — 조회·홀딩·수신거부·연락처 수정·수동 대상 추가는 MARKETING STAFF 가능. 편집·[지금 실행]·[실패 재실행]·실제 발송·대량 sync/import 는 여전히 ADMIN.

### 4-2. 개별 조작 (Role gate)

> 📌 **이번 스코프 원칙** — 기존 `USER` 권한 = `STAFF` **그대로 유지**. 페이지·조작별 세부 role gate 조정은 **별도 후속 작업**으로 분리한다.
> 지금은 롤 이름 리네이밍(USER→STAFF) + MANAGER·DIRECTOR 자리 확보 + Department(부서) 축 도입까지만.

| 조작 | 최소 롤 | 비고 |
|---|---|---|
| 통계·리스트 조회 | STAFF (DIRECTOR·MANAGER·ADMIN 포함) | 부서 gate 통과 후 · DIRECTOR/ADMIN 은 부서 gate 우회 |
| SMS 조회·홀딩·수신거부·연락처 수정·수동 대상 추가 | STAFF (MARKETING 부서) | § 5-2 완화 반영 (2026-09-03) · MEDICAL 부서 접근 X |
| SMS 큐 상태·목록 조회 (GET `/api/admin/batch/sms/queue/status`·`/rows`·`/statuses`) | STAFF (MARKETING 부서) | SMS 페이지 진입 시 자동 조회되는 카드용 · MARKETING 개방 |
| SMS 오프셋 편집 · 실제 발송 · sync · targets/import | ADMIN | 실 발송·정책 조작이라 잠금 유지 |
| SMS [실패·취소 재실행] (POST `/queue/retry`) | MANAGER (MARKETING 부서) | **2026-09-07 완화** — 실무 판단(오래된 취소를 다시 보낼지)이 필요하나 실 발송 트리거는 아니라 매니저 이상 상시 노출. STAFF 는 여전히 불가. |
| SMS [지금 실행] (POST `/queue/run`) · 배치 재실행 · 원데이 소급 보정 | ADMIN | 지금과 동일 · DIRECTOR 도 불가 |
| 사용자 계정 CRUD (계정 관리 페이지) | ADMIN | `/admin/accounts` · `/api/admin/users/**` · 자기 롤·부서 변경 X · 자기 삭제 X · 마지막 ADMIN 삭제 X |

**MANAGER 실권한 분화**·**SMS 완화 실행**·**드림렌즈/B2B 등 재정 조작 롤 조정** 은 모두 다음 사이클에서 별도 문서/티켓으로 다룬다.

---

## 5. 구현 위치

### 5-1. 백엔드 (착수 완료 · 2026-09-03)

| 파일 | 변경 |
|---|---|
| `auth/entity/Role.java` | `USER` → `STAFF` 리네이밍 · `MANAGER` · `DIRECTOR` 추가 |
| `auth/entity/Department.java` (신설) | `ALL` · `MEDICAL` · `MARKETING` enum |
| `auth/entity/User.java` | 모든 컬럼에 `@Column(name = ...)` 명시. `Department department` 필드 (NOT NULL, DEFAULT `MEDICAL`) — ADMIN·DIRECTOR 는 `ALL`, MANAGER·STAFF 는 `MEDICAL`/`MARKETING` |
| `auth/config/JwtUtil.java` | JWT claims 에 `dept` 실음 · `role`·`dept` 파싱은 grace 없이 401 (옛 토큰 · 알 수 없는 값 모두) |
| `auth/config/JwtAuthenticationFilter.java` | JWT 인증 시 `ROLE_XXX` + `DEPT_XXX` authority 2개를 SecurityContext 에 실음 (X1-A 이후) |
| `auth/config/SecurityConfig.java` | `/api/admin/**` `hasRole('ADMIN')` · SMS 매처 세분화 (오프셋 편집·발송·sync·import → ADMIN, 그 외 SMS → MARKETING) · 통계/리스트/리포트를 부서 gate 로 분리 (MARKETING 전용 vs MEDICAL 전용) |
| `auth/config/DataInitializer.java` | 기본 ADMIN 은 `Department.ALL` · 시더는 명시적으로 부서 부여 |
| `auth/dto/LoginResponse.java` | `UserDto` 에 `Department department` 필드 추가 |
| `auth/service/AuthService.java` | 토큰 생성·응답에 `user.getDepartment()` 실음 |

**DB 스키마 정리는 수동으로** — 초기에는 `UserRoleMigration` 을 두어 startup 시점에 자동 처리했으나(2026-09-03 착수), 개발 단계라 DB 를 직접 조작 가능해 개발자가 콘솔로 처리 완료 후 해당 클래스를 제거했다. 이후 다른 환경에 배포할 때도 아래 세 가지를 수동 실행:

1. 옛 컬럼 단위 CHECK 제거: `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check; ALTER TABLE users DROP CONSTRAINT IF EXISTS users_department_check;`
2. 컬럼 추가 & 데이터 정정: `ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(20) NOT NULL DEFAULT 'MEDICAL';` · `UPDATE users SET role='STAFF' WHERE role='USER';` · `UPDATE users SET department='ALL' WHERE role IN ('ADMIN','DIRECTOR');`
3. 조합 CHECK 부여: `ALTER TABLE users ADD CONSTRAINT users_role_department_scope_ck CHECK ((role IN ('ADMIN','DIRECTOR') AND department='ALL') OR (role IN ('STAFF','MANAGER') AND department IN ('MEDICAL','MARKETING')));`

**부서 gate 구현 방식 (2026-09-03 X1-A)** — `JwtAuthenticationFilter` 가 인증 시 `DEPT_XXX` 를 SimpleGrantedAuthority 로 추가 → `SecurityConfig` 매처가 `hasAnyAuthority("DEPT_MARKETING", "DEPT_ALL")` 로 판정. URL prefix 로 나눔:

- **MARKETING 전용** — `/api/stats/reservation-channel/**`, `/api/stats/channel-profit/**`, `/api/overseas-marketing/**` (해외마케팅 조회·수기 입력·수동 매칭 · **단 `POST /sync-sheet`·`/sync-crm` 은 ADMIN 만**), `/api/stats/marketing/**`, `/api/accumulated-eyes/**`, `/api/sms-management/**` (조회·홀딩·수신거부·수동 추가 등)
- **홈(대시보드) 요약 KPI — 양 부서 개방** (§ 5-1 "홈화면" 규정 이행 · 2026-09-07): `GET /api/stats/reservation-overall/monthly` · `GET /api/stats/procedure-exam/monthly` · `GET /api/stats/surgery/panel/trend` (KPI·월별 추이·시술별 비중 공용) · `GET /api/stats/outpatient-count/monthly` · `GET /api/stats/reservation-stats-system` (base 경로만 · 하위 `/cell`·`/diagnostics/**` 는 MEDICAL 유지)
- **MEDICAL 전용** — `/api/stats/**` (그 외), `/api/report/**`, `/api/exam-list/**`, `/api/cataract-exam-list/**`, `/api/all-exam-list/**`, `/api/eoeis-checkup/**`, `/api/surgery-list/**`, `/api/reoperation-decisions/**`, `/api/outpatient-list/**`, `/api/reservation-list/**`, `/api/reservation-list-homepage/**`, `/api/dreamlens-ledger/**`
- **ADMIN 전용** — `/api/admin/**`, `PUT /api/sms-management/offsets`, `POST /api/sms-management/{send,sync,targets/import}`, `POST /api/overseas-marketing/{sync-sheet,sync-crm}` (**2026-09-11 강화**: 해외마케팅 두 동기화 잡은 무거운 외부 조회를 켜므로 ADMIN 만) (예외 두 건: `GET /api/admin/batch/sms/queue/{status,rows,statuses}` 3종은 MARKETING 개방 · SMS 페이지 진입 시 자동 조회 / `POST /api/admin/batch/sms/queue/retry` 는 MANAGER 이상 + MARKETING 부서 개방 · 2026-09-07 완화)

`DEPT_ALL` 이 항상 허용 목록에 들어가 있어 ADMIN·DIRECTOR 는 자동 통과.

**주의 — URL prefix 목록은 프론트 `MARKETING_ONLY_PAGE_IDS` 와 동기화 필요.** 크로스 언어 sharing 은 오버킬이라 이중 유지. 페이지 추가 시 두 곳 모두 갱신.

### 5-2. 프론트 (착수 완료 · 2026-09-03)

| 파일 | 변경 |
|---|---|
| `stores/auth-session.ts` | `UserRole` 4단 · 신설 `UserDepartment = 'ALL'\|'MEDICAL'\|'MARKETING'` · `AuthUser.department` (필수) · 헬퍼 `canSystemOp(user)` = `role === 'ADMIN'` · `matchesDepartment(user, deps)` = `department==='ALL' \|\| deps.includes(department)` · 방어적 정규화 (알 수 없는 role → STAFF, 빈 값 → MEDICAL) |
| `stores/authStore.ts` | `AuthUser` 타입 확장에 따라 그대로 흐름 |
| `api/auth.ts` | `LoginUser.department` 추가 |
| `config/navigation.ts` | `MARKETING_ONLY_PAGE_IDS` Set + `isMarketingOnlyPage()` + `getPageDepartments(id)` 헬퍼 신설. `MEDICAL` 은 기본값 |
| `components/layout/Sidebar.tsx` | `pruneByDepartment` 필터 추가 — 잎의 부서 태그 판정, 자식이 비면 그룹·섹션도 제거 (대칭 구조 강제) |
| `pages/pageRegistry.ts` | `isRouteBlocked(pageId, isProd, user)` — 부서 gate 층 추가. 기존 UserRole 만 넘기던 호출은 `isRouteBlockedByRole` deprecated 헬퍼 유지 |
| `pages/pageRegistry.test.ts` | 부서 gate 케이스 3개 추가 (MARKETING 전용 · MEDICAL 전용 · ALL 우회) |
| `router.tsx` | 통계 라우트 렌더 시 `user` 객체(role+department) 전달 |
| `pages/sms/SmsOffsetGrid.tsx` · `SmsQueueStatusCard.tsx` | 흩어진 `role === 'ADMIN'` → `canSystemOp(user)` 로 통일 |

### 5-3. 문서

| 파일 | 변경 |
|---|---|
| `CLAUDE.md` | 롤·부서 정책 섹션 추가 예정 (별도 후속) |
| `docs/sms/strategy.md` § 5-2 | STAFF 롤 기준 표기 갱신 예정 (별도 후속) |
| `docs/auth/permissions.md` (이 문서) | 이번 착수 결과 반영 · 진행 이력 갱신 |

---

## 6. 마이그레이션 계획

### 6-1. 순서 (실제 착수 완료 · 2026-09-03)

1. **엔티티** — `Role` 4단 확장 + `Department` 신설 + `User` 컬럼명 명시. Hibernate `ddl-auto: update` 가 `department` 컬럼을 자동 ALTER
2. **DB 수동 정리** — 개발 DB 에서 옛 CHECK 제거 · role/department 값 정정 · 조합 CHECK 부여 (§ 5-1 하단 SQL). 개발 단계라 startup 훅 없이 수동으로 처리
3. **백엔드** — `JwtUtil` claim `dept` · `LoginResponse.department` · `AuthService` 반영. `SecurityConfig` 는 이번 스코프에서 매처 변경 없음(별도 후속)
4. **프론트** — `auth-session` 타입/헬퍼 · `navigation` 부서 매핑 · `Sidebar` 필터 · `pageRegistry` 부서 gate · SMS 카드 `canSystemOp` 리팩터 · 테스트 3케이스 추가
5. **문서** — 이 문서 갱신 · CLAUDE.md · SMS strategy 는 별도 후속
6. **검증** — backend 247/247 · frontend 287/287 · frontend lint/build 통과

### 6-2. 롤백

- 코드는 커밋 되돌리면 즉시 원복. `Role.USER` 참조가 완전히 사라졌는지 확인 필요
- DB: `users.department` 컬럼과 CHECK 제약이 남아있어도 롤백된 코드 (Role.USER 재도입) 는 정상 동작. 컬럼 자체 삭제는 별도 조치 필요

### 6-3. 하위 호환

- **기존 JWT**: grace 없음. **전원 재로그인 유도.** 배포 직후 발급된 토큰에 `role: "USER"` 가 실려 있으면 `JwtException` → 401 → 재로그인 → 새 토큰에 `STAFF` + `dept` 실림.
  - 이유: grace 코드(`USER → STAFF` fallback) 를 두면 삭제 시점을 잊기 쉽고, 조직 규모(내부 20~50명)에서 재로그인 강제 비용이 크지 않다.
  - `JwtUtil.getRoleFromToken()` 에서 알 수 없는 값이 오면 `JwtException` (401)
  - `dept` 클레임이 없는 구 토큰(임시 상황)은 `Department.ALL` 로 폴백 — 서명이 유효하면 통과. 재로그인이 즉시 반영되도록 유도
- **DB `USER` 잔재 / `department` 결측**: 개발 DB 는 수동 UPDATE 로 정리 (§ 5-1 하단 SQL 참조). 다음 환경으로 넘어가면 그때 다시 수동 실행하거나 배치·시더로 흡수

---

## 7. 향후 확장

### 7-1. VIEWER 추가 시점
- 실제 열람 전용 사용자 요청이 오면. 지금 도입은 유령 롤이 될 위험.
- 추가 시 PII 마스킹 규칙 함께 정의 (연락처·이름 뒷자리 마스킹 등)

### 7-2. MANAGER 실권한 분화
- 트리거는 "MANAGER 만 되고 STAFF 는 못 하는" 조작이 실제로 필요해질 때
- 후보:
  - CSV export 대량 다운로드
  - 예산·목표 편집 (신규 UI)
  - 부서 스코프 리포트 (마케팅 팀장이 자기 채널만)

### 7-3. Department 확장
- 부서가 늘어나면 `Department` enum 확장 (예: `FINANCE`, `HR`)
- 3개 넘어가면 단일 필드 대신 `Set<Department>` 로 확장 검토 (지금은 단일이면 충분)

### 7-3a. 소속(회사·법인) 축 신설
- 이번 `department` 는 부서 축. 향후 관계사·법인 편입이 생기면 별도 `Organization` (또는 `Company`) 필드 추가.
- 이 축이 생기면 gate 는 3층 (Organization → Department → Role) 로 확장

### 7-4. Audit log
- 지금 `batch_run_log` 는 있으나 SMS 조작·롤 부여 등은 이력 없음
- 의료 도메인이라 개인정보보호법 감사 대응 대비해 별도 검토 필요 (이 문서 스코프 밖)

---

## 8. 결정 지점 정리 (참고)

| # | 결정 사항 | 결과 |
|---|---|---|
| 1 | 롤 몇 단계? | 4단계 (ADMIN/DIRECTOR/MANAGER/STAFF). VIEWER 유보. |
| 2 | MANAGER 지금 권한? | STAFF 와 동일 (이름만 분리, 향후 gating) |
| 3 | STAFF 는 지금 USER 와 동일? | ✅ 그렇다. 리네이밍 |
| 4 | 부서 몇 종? | 2종 (MEDICAL · MARKETING) + org-less 표식 `ALL` |
| 5 | 부서 접근 범위? | **대칭 구조**. MEDICAL = 홈 + 메디컬 그룹. MARKETING = 홈 + 마케팅 그룹. 서로 상대 그룹 안 보임. |
| 6 | ADMIN 의 부서? | ❌ 소속 없음 → `department = 'ALL'`. ADMIN 은 개발자 전용, 부서 축 무관. 전 그룹 접근. |
| 7 | 홈화면 노출? | ✅ 모두. 실 데이터 연동됨. |
| 8 | 이번 스코프에 페이지·조작별 세부 role gate 포함? | ❌ 별도 후속. 기존 USER 권한 = STAFF 그대로 유지. |
| 9 | 기존 JWT 하위 호환? | ❌ grace 없음. 전원 재로그인. |
| 10 | MEDICAL 도 마케팅 그룹 안 보임? | ✅ 대칭 (MANAGER/STAFF 기준). ADMIN·DIRECTOR 는 우회. |
| 11 | ADMIN 보다 낮은 org 무소속 롤이 필요? | ✅ **DIRECTOR 신설**. 두 그룹 전부 열람 · 시스템 조작(배치·SMS·오프셋·사용자 부여) X · STAFF 수준 조작만. 원장·임원·본부장 대상. |
| 12 | `null` 로 org 없음 표현? | ❌ **`ALL` enum 값** 으로 표현. NOT NULL 유지 → null-check 흩어짐 방지 · CHECK 제약으로 조합 강제. |
| 13 | 필드 이름 `org` vs `department`? | ✅ **`department`**. 향후 "소속(회사·법인)" 축이 별도로 추가될 수 있어 개념 분리. |
| 14 | 부서 값 이름? | `BVIIT` → **`MEDICAL`** 로 리네이밍. 회사명 대신 조직 기능(진료·수술) 을 나타냄. |
| 15 | User 엔티티 컬럼명 표기? | ✅ **`@Column(name=...)` 명시**. Hibernate 자동 매핑 대신 컬럼명 하드코딩으로 참조 안정성 확보. |

---

## 9. 진행 이력

| 날짜 | 단계 | 커밋 | 내용 |
|------|------|------|------|
| 2026-09-02 | 스펙 초안 | | 4단계 롤 vs 3단계 검토 후 3단계로 확정 · Org 2종 도입 · 매트릭스·매핑 초안 문서화 |
| 2026-09-02 | 스코프 축소 | | 이번 작업은 롤 리네이밍(USER→STAFF) + MANAGER 자리 확보 + Org 도입까지로 한정. 페이지·조작별 role gate 세부 조정(SMS 완화 · MANAGER 분화 · 재정 조작 등) 은 별도 후속으로 분리. |
| 2026-09-02 | Org 대칭 확정 | | § 2-2 · § 3 · § 4-1 · § 8 갱신. BVIIT ↔ MARKETING 이 서로 상대 그룹 접근 불가한 **대칭 구조** 로 확정. 이전에는 BVIIT 가 마케팅도 봤으나, 사용자 명시로 뒤집힘. Q10 결정 지점 추가. |
| 2026-09-03 | ADMIN org 무소속 확정 | | § 2-2 · § 2-3 · § 3 · § 4-1 · § 5-1 · § 5-2 · § 8(Q6) 갱신. **ADMIN 은 개발자 전용 · org 소속 없음(`user.org = null`) · 전 그룹 접근**. 이전에는 `ADMIN × BVIIT` 였으나 뒤집힘. `User.org` 는 nullable, MANAGER/STAFF 만 org 필수. Org gate 는 ADMIN 우회. |
| 2026-09-03 | 명명 재조정 · 착수 | | Q12·Q13·Q14·Q15 결정. `null` → **`ALL` enum 값** (NOT NULL 유지). `Org` → **`Department`** 리네이밍 (향후 회사·법인 축 별도 도입 대비). `BVIIT` → **`MEDICAL`**. User 엔티티에 `@Column(name=...)` 명시. 백엔드 (Role·Department enum · User · JwtUtil · LoginResponse · AuthService · DataInitializer) + 프론트 (auth-session · navigation · Sidebar · pageRegistry · router · SMS 카드 2종) + 테스트 3케이스 추가. 초기에는 `UserRoleMigration` startup 훅 도입 — 개발 DB 수동 처리 후 삭제 · 백엔드 CHECK 제약은 개발 DB 에 수동 부여. **backend 247/247 · frontend 287/287 · lint/build 모두 통과.** |
| 2026-09-03 | DIRECTOR 신설 | | § 2-1 · § 2-2 · § 2-3 · § 3 · § 4-1 · § 4-2 · § 5-1 · § 5-2 · § 8(Q1·Q10·Q11) 갱신. **DIRECTOR = 임원·경영진 · org 소속 없음 · 두 그룹 전부 열람 · 시스템 조작 X (STAFF 수준 조작만)**. ADMIN 과 org gate 우회 공유, Role gate 에서 시스템 조작만 ADMIN 으로 좁힘. 4단 롤 확정. |
| 2026-09-03 | 1차 감사 · F1~F6 수정 | | 정밀 전수조사 결과 6개 이슈 확정 → 수정: **F1** `getPageDepartments('home')` 이 `MEDICAL` 로 판정돼 MARKETING STAFF 사이드바에서 홈이 사라지는 버그 → `statsPages` 밖 id 는 `undefined` 반환 · **F2** `JwtUtil.getDepartmentFromToken` 의 `ALL` grace fallback 제거 (호출자 없고 문서 § 6-3 "grace 없음" 원칙과 모순) · **F3** `Role.isOrgless()` dead 삭제 + Javadoc "org" → "부서" · **F4** User·Department 주석에 삭제된 `UserRoleMigration` 참조 정리 · **F5** `pageRegistry.isRouteBlockedByRole` dead 삭제 · **F6** 미세 주석 갱신. 홈 케이스 유닛 테스트 1건 추가. **backend 247/247 · frontend 288/288 · lint/build 통과.** |
| 2026-09-03 | 2차 감사 · G1~G5 문서 정리 | | 심층 재조사 결과 문서 정합성 이슈 5건 확정 → 이 문서 자체 정리: § 4-2 서문 "Org 도입" → "부서 도입" · § 5-1 표에서 삭제된 `isOrgless()` 잔재 제거 · § 5-1 하단 UserRoleMigration 히스토리 명확화 · § 9 이력에 완료된 "_다음_" 줄 제거 + 오늘 감사·수정 이력 신설. 코드 변경 없음. |
| 2026-09-03 | 후속조치 · 테스트 커버리지 확장 | | 2차 감사 G6~G9 후속: **G6~G8** `AuthSecurityIntegrationTest` 에 신규 6 케이스 — 로그인 응답에 `role`·`department` jsonPath 검증 · STAFF+MEDICAL/MARKETING 토큰 인증 통과 · STAFF/DIRECTOR 의 `/api/admin/**` 403 · 옛 `role='USER'` 토큰 → 401 · 알 수 없는 role → 401 · **G9** `Sidebar.pruneByDepartment` export + `Sidebar.test.ts` 신설 (ADMIN/DIRECTOR/MEDICAL/MARKETING/null 시나리오 6 케이스). **X1**(백엔드 부서 gate + SMS 5-2 완화) · **X2**(개발용 시드 계정) 는 별도 스코프로 미룸. **backend 253/253 · frontend 294/294 · lint/build 통과.** |
| 2026-09-03 | X1 · 백엔드 부서 gate + SMS 5-2 완화 | | 사용자 결정 (마스킹 X · write 도 STAFF · SMS 는 MARKETING 전용) 반영. **X1-A** `JwtAuthenticationFilter` 가 인증 시 `DEPT_XXX` authority 추가 · `JwtUtil.getDepartmentFromToken` 재도입(grace 없이 401) · `SecurityConfig` 매처에 URL prefix 부서 gate 확장 (MARKETING 전용 5개 · MEDICAL 전용 8개 prefix + 나머지 authenticated). **X1-B** SMS 매처 세분화 — `PUT /offsets`·`POST /send`·`POST /sync`·`POST /targets/import` 는 ADMIN 유지 · 그 외 `/api/sms-management/**` 는 MARKETING 부서 · 프론트 `sms` 를 `ADMIN_ONLY_PAGE_IDS` 에서 제거 → `MARKETING_ONLY_PAGE_IDS` 로 이동 · `sms-management` 그룹 `adminOnly` 제거. **G9 리팩터 딸림**: lint 규칙(react-refresh) 준수 위해 `pruneByDepartment` 를 `Sidebar.tsx` → `config/navigation.ts` 로 이동. 신규 백엔드 테스트 10 케이스 (부서 gate 6 · SMS 완화 4). Sidebar.test.ts 는 MEDICAL STAFF 케이스 강화 (sms 이동으로 marketing-section 이 정상적으로 제거됨). **backend 263/263 · frontend 294/294 · lint/build 통과.** |
| 2026-09-03 | 계정 관리 페이지 (사용자 CRUD) | | 사용자 결정 (경로 `/admin/accounts` · 자기 롤·부서 변경 X · 편집 폼에 비밀번호 포함 · 삭제 확정 모달). **백엔드**: `UserAdminController`/`UserAdminService`/`UserRow`/`UserCreateRequest`/`UserUpdateRequest`/`User` 상태 변경 메서드 (`updateProfile`·`changeRoleAndDepartment`·`changePassword`·`isValidCombination`) · `UserRepository` 확장 (existsBy·countByRole·findAllByOrderByLoginIdAsc) · `GlobalExceptionHandler` 에 `ResponseStatusException` 404 처리 추가. **안전장치**: 자기 롤·부서 변경 400 · 자기 삭제 400 · 마지막 ADMIN 삭제 400 · 이메일·로그인아이디 중복 400 · 롤/부서 조합 강제 400. **프론트**: `statsPages.ts` 에 `account-management` 등록 · `ADMIN_ONLY_PAGE_IDS` 추가 · `api/admin/users.ts` · `hooks/admin/useUsers.ts` · `AccountManagementPage`/`UserFormDialog`/`DeleteConfirmDialog` (신규 3파일) · 롤/부서 셀렉트 상호 정규화 · 자기 자신 배지/버튼 비활성. 신규 백엔드 테스트 10 케이스 (권한·CRUD·자기 편집/삭제·조합 검증). **backend 273/273 · frontend 294/294 · lint(경고 1)/build 통과.** |
| 2026-09-03 | 3차 감사 · Q1 SMS 큐 조회 부서 개방 | | 심층 재조사에서 발견: `SmsManagementPage` 가 MARKETING STAFF 에게 열려 있는데 무조건 렌더되는 `SmsQueueStatusCard` 가 `/api/admin/batch/sms/queue/{status,rows,statuses}` 를 자동 조회 → 403 으로 카드가 깨짐. **수정**: `SecurityConfig` 에서 이 GET 3종 매처를 `/api/admin/**` 앞에 두고 `hasAnyAuthority("DEPT_MARKETING","DEPT_ALL")` 로 개방. POST `/run`·`/retry` 는 그대로 ADMIN. 회귀 방지 테스트 4 케이스 추가 (MARKETING 조회 통과 · MEDICAL 조회 403 · MARKETING run/retry 403). 문서 § 4-2 · § 5-1 갱신. |
| 2026-09-07 | SMS [실패·취소 재실행] 매니저 이상 완화 | | 사용자 결정: 이 버튼은 실무 판단(오래된 취소를 다시 보낼지)이 필요하나 실 발송 트리거가 아니라(폴러가 잡음) 매니저에게도 열어야 한다. **수정**: `SecurityConfig` 에서 `POST /api/admin/batch/sms/queue/retry` 매처를 `/api/admin/**` 앞에 두고 `WebExpressionAuthorizationManager` 로 `(DEPT_MARKETING or DEPT_ALL) and hasAnyRole('ADMIN','DIRECTOR','MANAGER')` 지정. 프론트 `auth-session.ts` 에 `canManagerOp(user)` 헬퍼 신설 (`ADMIN/DIRECTOR/MANAGER`). `SmsQueueStatusCard` 의 재실행 버튼은 이제 카운트 조건 없이 매니저 이상에게 상시 노출(라벨은 실패/취소 카운트에 따라 3분기), 배지는 "관리자" → "매니저↑". [지금 실행] 은 그대로 ADMIN. 통합 테스트 3 케이스 추가 (MARKETING MANAGER 통과 · MEDICAL MANAGER 403 · DIRECTOR 통과) + 기존 STAFF 403 케이스 유지. |
