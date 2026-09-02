# 권한 정책 — Role × Org 2축 모델

> 작성일: 2026-09-02 · 상태: **스펙 초안 (착수 대기)**
> 목적: 현재 2단계 롤(`ADMIN`/`USER`) 을 4단계 롤 + 소속 부서 2종으로 재정리하기 위한 설계·마이그레이션 계획.
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
| **ADMIN** | 정책·시스템 관리 | 오프셋 편집 · SMS [지금 실행] · 배치 재실행 · 사용자·롤 부여 |
| **MANAGER** | 조직 의사결정 (**개념상 자리만**) | STAFF 와 동일. 향후 경영 KPI export · 예산·목표 편집 등 분리 예정 |
| **STAFF** | 실무 조작 | 리스트 조회 · 홀딩·수신거부 · 연락처 수정 · 수동 대상 추가 (= 지금 `USER`) |

**의도적으로 뺀 것**: `VIEWER`. 실제 사용 케이스 없어 처음엔 3단계로 시작. 나중에 외부 열람 요청이 오면 그때 추가.

**MANAGER ≡ STAFF (지금)** — 권한 완전 동일. Role enum 에 자리만 만들고 hasAnyRole 로 묶어 취급. 향후 MANAGER 전용 조작이 생길 때 gating 을 하나씩 옮김.

### 2-2. Org (명사 축 — 어떤 데이터를 볼 수 있나)

| 소속 | 접근 스코프 |
|---|---|
| **BVIIT** | 전체 (검사·수술·전환·SMS·리포트·재정·마케팅 다) |
| **MARKETING** | 홈화면 + 마케팅 그룹만 |

**내부 부서**임을 전제 — 외주가 아니므로 인프라급 격리(IP 화이트리스트·별도 도메인 등) 는 하지 않음. 페이지·API 노출만 조절.

### 2-3. 조합 매트릭스

| Role \ Org | BVIIT | MARKETING |
|---|---|---|
| ADMIN | ✅ 원장·개발자 (전권) | 🚫 **금지** — ADMIN 은 BVIIT 만 |
| MANAGER | ✅ 실장·본부장 | ✅ 마케팅 팀장 |
| STAFF | ✅ 상담사·간호사 | ✅ 마케팅 실무자 |

**핵심 제약**: `ADMIN × MARKETING` 조합은 불허. 이유 — ADMIN 은 시스템 정책 조작(배치·SMS 발송·오프셋) 을 다루므로 조직 스코프가 걸린 사용자에게 부여하지 않음. 마케팅 조직의 최고 등급은 MANAGER.

---

## 3. 판정 두 층으로 나뉜다

```
접근 요청
  │
  ├─ 1층 Org gate — "이 페이지·API 는 네 조직에 열려 있나?"
  │    · /, /stats/marketing/*, /stats/channel-profit  → BVIIT, MARKETING
  │    · /stats/exam-list, /report/*, /admin/*         → BVIIT only
  │
  └─ 2층 Role gate — "네 롤이 이 조작을 할 수 있나?"
       · GET  /offsets, /targets            → STAFF 이상
       · PUT  /offsets, POST /queue/run     → ADMIN
       · POST /admin/batch/**               → ADMIN
```

**두 층을 섞지 않는 이유** — 페이지 추가 시 org 태그만 붙이면 되고, 롤 조작이 늘어나도 org 태그를 다시 안 건드림. 지금처럼 판정이 개별 컴포넌트에 흩뿌려지지 않는다.

---

## 4. 페이지·API 매핑

### 4-1. 페이지 (`orgs` 태그)

| 그룹 | 페이지 | orgs |
|---|---|---|
| — | 홈화면 `/` | BVIIT, MARKETING |
| **마케팅** | channel-profit · overseas · marketing | BVIIT, MARKETING |
| 예약 | reservation-list · reservation-overall · reservation-stats-system · reservation-stats-cataract · reservation-list-homepage · (reservation) | BVIIT |
| 검사 | overall-exam · overall-exam-weekly · exam-list · cataract-exam-list · all-exam-list · eoeis-checkup · examination · procedure-exam | BVIIT |
| 전환&성공률 | consultation-rate · cataract-reservation-rate · stop-rate · stop-reason | BVIIT |
| 수술 | surgery-list · surgery · surgery-ratio · surgery-composition | BVIIT |
| 외래 | outpatient-list · outpatient-count | BVIIT |
| Report | weekly-report · monthly-report | BVIIT (마케팅 노출 X) |
| 기타 | dreamlens-revenue · b2b-revenue · (그 외 미구현 8종) | BVIIT |
| 관리자 | batch-management · SMS 관리 그룹 | BVIIT + Role gate (ADMIN) |

### 4-2. 개별 조작 (Role gate)

> 📌 **이번 스코프 원칙** — 기존 `USER` 권한 = `STAFF` **그대로 유지**. 페이지·조작별 세부 role gate 조정은 **별도 후속 작업**으로 분리한다.
> 지금은 롤 이름 리네이밍(USER→STAFF) + MANAGER 자리 확보 + Org 도입까지만.

| 조작 | 최소 롤 | 비고 |
|---|---|---|
| 통계·리스트 조회 | STAFF | org gate 통과 후 |
| SMS 관련 조작 전반 (지금 ADMIN 잠금 유지) | ADMIN | § SMS 5-2 완화는 **별도 후속** |
| 배치 재실행 (관리자 화면) · 원데이 소급 보정 | ADMIN | 지금과 동일 |
| 사용자·롤 부여 (향후 신설) | ADMIN | |

**MANAGER 실권한 분화**·**SMS 완화 실행**·**드림렌즈/B2B 등 재정 조작 롤 조정** 은 모두 다음 사이클에서 별도 문서/티켓으로 다룬다.

---

## 5. 구현 위치

### 5-1. 백엔드

| 파일 | 변경 |
|---|---|
| `auth/entity/Role.java` | `USER` → `STAFF` 리네이밍, `MANAGER` 추가 |
| `auth/entity/Org.java` (신설) | `BVIIT` · `MARKETING` enum |
| `auth/entity/User.java` | `Org org` 필드 (기본값 `BVIIT`) |
| `auth/config/JwtUtil.java` | JWT claims 에 `org` 실음, `role` claim 파싱은 `STAFF` 도 인식 |
| `auth/config/SecurityConfig.java` | STAFF·MANAGER 를 `hasAnyRole('STAFF','MANAGER','ADMIN')` 로 묶어 처리 |
| `auth/config/DataInitializer.java` | 기본 사용자 생성 시 `Org.BVIIT` 부여 |
| DB 마이그레이션 (`V64__role_rename_and_org.sql` 신설) | `users.role` 값 `'USER'` → `'STAFF'` · `users.org` 컬럼 추가 (`DEFAULT 'BVIIT' NOT NULL`) |

**Org gate 판정은 어디에 두나** — API 별 `@PreAuthorize("@orgGate.canAccess('MARKETING_ONLY')")` 방식보다는, `/api/marketing/**` 같은 URL prefix 로 매처를 나누는 편이 단순. 지금 대부분 API 가 `/api/stats/{pageId}` 라 pageId 기반 판정이 필요하면 `PageOrgResolver` 를 두는 방향으로 검토.

### 5-2. 프론트

| 파일 | 변경 |
|---|---|
| `stores/authStore.ts` | `user.org` 필드 저장 (기존 role 옆에) |
| `config/statsPages.ts` | 각 페이지에 `orgs: ['BVIIT'\|'MARKETING']` 태그 |
| `config/navigation.ts` | 사이드바 필터에 `user.org` 조건 추가 (`adminOnly` 옆) |
| `pages/pageRegistry.ts` | `isRouteBlocked` 에 org gate 층 추가 |
| `api/client.ts` (또는 헬퍼) | `canX(user)` 계열 유틸로 흩어진 `role !== 'ADMIN'` 정리 |

### 5-3. 문서

| 파일 | 변경 |
|---|---|
| `CLAUDE.md` | 롤·org 정책 섹션 추가. Dashboard "하드코딩 목업" 서술 갱신 (실 API 연동됨) |
| `docs/sms/strategy.md` § 5-2 | STAFF 롤 기준으로 서술 갱신 (현재 "일반 사용자" 표현을 STAFF 로) |
| `docs/auth/permissions.md` (이 문서) | 진행 이력 갱신 |

---

## 6. 마이그레이션 계획

### 6-1. 순서

1. **DB 마이그레이션** — `V64__role_rename_and_org.sql` — 기존 데이터에 영향 없이 컬럼만 추가·값 치환
2. **백엔드** — Role enum · Org enum · User 필드 · JWT claim · SecurityConfig
3. **프론트** — authStore · statsPages `orgs` 태그 · Sidebar 필터 · pageRegistry 차단
4. **문서** — CLAUDE.md 갱신 · SMS strategy 갱신
5. **검증** — MARKETING 테스트 계정으로 사이드바·직접 URL 접근 확인

### 6-2. 롤백

- DB 마이그레이션은 되돌리기 어려운 컬럼 추가라 rollback SQL 별도 준비 안 함 (안전)
- 코드는 커밋 되돌리면 즉시 원복. `Role.USER` 참조가 완전히 사라졌는지 확인 필요 (혹시 남아 있으면 `STAFF` 로 매핑)

### 6-3. 하위 호환

- **기존 JWT**: grace 없음. **전원 재로그인 유도.** 배포 직후 발급된 토큰에 `role: "USER"` 가 실려 있으면 401/403 유발 → 재로그인 → 새 토큰에 `STAFF` + `org` 실림.
  - 이유: grace 코드(`USER → STAFF` fallback) 를 두면 삭제 시점을 잊기 쉽고, 조직 규모(내부 20~50명)에서 재로그인 강제 비용이 크지 않다.
  - `JwtUtil.getRole()` 에서 알 수 없는 값이 오면 예외로 401 처리 (지금은 조용히 `Role.USER` fallback — 이걸 없앤다).
- **DB `USER` 잔재**: 마이그레이션에서 UPDATE 처리하므로 신경 안 씀. 배포 시점: 마이그레이션 → 백엔드 재기동 → 사용자 재로그인 순.

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

### 7-3. Org 확장
- 다른 부서가 조직으로 편입되면 추가 (예: `FINANCE`, `HR`). enum 확장으로 처리.
- Org 가 3개 넘어가면 `Org` 단일 필드 대신 `Set<Org>` 로 확장 검토 (지금은 단일이면 충분)

### 7-4. Audit log
- 지금 `batch_run_log` 는 있으나 SMS 조작·롤 부여 등은 이력 없음
- 의료 도메인이라 개인정보보호법 감사 대응 대비해 별도 검토 필요 (이 문서 스코프 밖)

---

## 8. 결정 지점 정리 (참고)

| # | 결정 사항 | 결과 |
|---|---|---|
| 1 | 롤 몇 단계? | 3단계 (ADMIN/MANAGER/STAFF). VIEWER 유보. |
| 2 | MANAGER 지금 권한? | STAFF 와 동일 (이름만 분리, 향후 gating) |
| 3 | STAFF 는 지금 USER 와 동일? | ✅ 그렇다. 리네이밍 |
| 4 | Org 몇 종? | 2종 (BVIIT · MARKETING) |
| 5 | MARKETING 접근 범위? | 홈화면 + 마케팅 그룹만. 리포트도 제외. |
| 6 | ADMIN × MARKETING 조합 허용? | ❌ 금지. ADMIN 은 BVIIT 만. |
| 7 | 홈화면 노출? | ✅ 모두. 실 데이터 연동됨. |
| 8 | 이번 스코프에 페이지·조작별 세부 role gate 포함? | ❌ 별도 후속. 기존 USER 권한 = STAFF 그대로 유지. |
| 9 | 기존 JWT 하위 호환? | ❌ grace 없음. 전원 재로그인. |

---

## 9. 진행 이력

| 날짜 | 단계 | 커밋 | 내용 |
|------|------|------|------|
| 2026-09-02 | 스펙 초안 | | 4단계 롤 vs 3단계 검토 후 3단계로 확정 · Org 2종 도입 · 매트릭스·매핑 초안 문서화 |
| 2026-09-02 | 스코프 축소 | | 이번 작업은 롤 리네이밍(USER→STAFF) + MANAGER 자리 확보 + Org 도입까지로 한정. 페이지·조작별 role gate 세부 조정(SMS 완화 · MANAGER 분화 · 재정 조작 등) 은 별도 후속으로 분리. |
| _다음_ | 착수 | | DB 마이그레이션 V64 + Role/Org enum · JWT · SecurityConfig · 프론트 authStore·statsPages·Sidebar·pageRegistry · 문서 3종 갱신 |
