# EventNote (이벤트 노트) — 개발 설계

> 상태: **설계 초안** (2026-09-23) · 도메인 패키지 `com.bviit.analytics.event`
> 선행 작업: `event/entity/EventNote.java` (스키마 초안, 커밋 전)

## 1. 목적

**특정 시점에 발생한 이벤트**(프로모션 시작, 광고 집행, 장비 교체, 휴진, 시스템 장애 등)를 날짜와 함께 기록하는 노트다.
통계 차트에서 "이 날 수치가 왜 튀었나?"를 바로 확인할 수 있도록 **차트 위에 이벤트 마커로 겹쳐 보여 주는 것**이 최종 목표다.

| 소비처 | 필요한 것 | API |
|---|---|---|
| 관리자 페이지 (이벤트 노트 관리) | 기간 필터 + **페이징** 목록, 등록·수정·삭제 | `/api/event/notes` |
| 통계 차트 (오버레이) | 차트 기간에 걸리는 이벤트 **전체** (페이징 없음) | `/api/event/notes/all` |

> API 는 `/api/admin/**` 으로 나누지 않고 **`/api/event` 를 도메인 루트로 한 경로 하나**로 둔다 (컨트롤러 1개). 권한은 URL 이 아니라 HTTP 메서드별 매처로 가른다 (§4-7).

드림렌즈 장부·해외마케팅 접수리스트처럼 **사용자가 직접 입력하는 원천 데이터**라서 배치 마트 파이프라인을 타지 않고 JPA 엔티티로 CRUD 한다
(CLAUDE.md 「예외 — 사용자가 직접 입력하는 원천 데이터」).

## 2. 결정 필요 사항 (구현 전 확정)

| # | 질문 | 제안 (기본값) |
|---|---|---|
| Q1 | `event_date` 와 `start_date`/`end_date` 의 관계 | `event_date` **필수**(차트 마커 기준점). `start_date`/`end_date` 는 **선택** — 기간형 이벤트(예: 9/1~9/14 프로모션)일 때만 채우며, 채우면 차트에 구간(ReferenceArea)으로 그린다. 채울 때는 `start_date ≤ event_date ≤ end_date` 여야 한다. |
| Q2 | "날짜에 따라 조회"의 기준 | **`event_date` 만 본다** (`from ≤ event_date ≤ to`, 양 끝 포함). `start_date`/`end_date` 는 조회 조건에 쓰지 않고, 차트에 구간을 그릴 때만 쓴다. (2026-09-23 확정 — 기간 겹침 방식은 채택하지 않음) |
| Q3 | 누가 작성·수정할 수 있나 | 작성·수정·삭제(POST·PUT·DELETE)는 **ADMIN + MEDICAL·MARKETING 부서**(MANAGER·STAFF). DIRECTOR(임원, `DEPT_ALL`)는 "열람만·조작 X" 원칙대로, OVERSEAS_MARKETING 은 범위 밖이라 제외. 조회(GET)는 **로그인한 전원**. (2026-09-23 확정) |
| Q4 | 이벤트를 부서별로 나눌 것인가 (마케팅 이벤트는 마케팅 차트에만 등) | 1차는 **나누지 않음** (YAGNI). 필요해지면 `category` 컬럼을 추가한다. |
| Q5 | 어느 차트에 먼저 붙일까 | 1차는 **월간 레포트/주차 레포트** 두 곳. 공용 오버레이 컴포넌트로 만들어 두고 나머지 차트는 순차 적용한다. |

## 3. 데이터 모델

### 3-1. BaseEntity (신규 · 공용)

`common/entity/BaseEntity.java` — Spring Data JPA Auditing으로 생성자·생성일시·수정자·수정일시를 **자동 주입**한다.

```java
@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @CreatedBy
    @Column(name = "created_by", length = 50, nullable = false, updatable = false)
    private String createdBy;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedBy
    @Column(name = "updated_by", length = 50, nullable = false)
    private String updatedBy;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
```

`common/config/JpaAuditingConfig.java`:

```java
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaAuditingConfig {

    /** 로그인 사용자의 loginId (JWT subject = authentication.getName()). 비로그인·배치 경로는 "system". */
    @Bean
    public AuditorAware<String> auditorAware() {
        return () -> Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(Authentication::isAuthenticated)
                .filter(auth -> !(auth instanceof AnonymousAuthenticationToken))
                .map(Authentication::getName)
                .or(() -> Optional.of("system"));
    }
}
```

설계 포인트:
- **`@EnableJpaAuditing` 은 `AnalyticsApplication` 에 붙이지 않고 별도 `@Configuration` 에 둔다.** 메인 클래스에 붙이면 `@WebMvcTest` 슬라이스 테스트가 JPA 메타모델을 찾다가 기동에 실패한다.
- 사용자 식별값은 SMS·해외마케팅과 같은 **`authentication.getName()` (loginId)** 을 쓴다 (`SmsManagementController` 의 `actor`, 해외마케팅의 `created_by` 와 같은 규칙).
- 시간 타입은 기존 엔티티(`DreamlensLedgerEntry`·`SmsOptOut`)와 같은 `LocalDateTime` 이다(JVM 타임존 Asia/Seoul 기준). 초안의 `ZonedDateTime` import 는 쓰지 않으므로 제거한다. `OffsetDateTime` 이 필요해지면 `DateTimeProvider` 빈을 추가해야 한다.
- **적용 범위**: 1차는 EventNote 만 상속한다. 기존 엔티티(드림렌즈·SMS 등)는 `created_at`/`updated_at` 를 직접 채우고 있으므로 이번에 옮기지 않는다 (컬럼명·NOT NULL 조건이 서로 달라 별도 작업이 필요하다).
- 프런트에서 audit 필드를 보내도 무시된다 — Request DTO 에 해당 필드를 두지 않는다.

### 3-2. EventNote

`event/entity/EventNote.java` (초안 수정안):

```java
@Entity
@Table(name = "event_note",
       indexes = @Index(name = "idx_event_note_event_date", columnList = "event_date"))
@SQLRestriction("delete_flag = false")        // 소프트 삭제 행은 모든 JPA 조회에서 제외
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EventNote extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;                // 이벤트 발생일 (차트 마커 기준)

    @Column(name = "summary", length = 100, nullable = false)
    private String summary;                     // 요약 (차트 툴팁·목록 제목)

    @Column(name = "description", columnDefinition = "text")
    private String description;                 // 본문

    @Column(name = "start_date")
    private LocalDate startDate;                // 기간형 이벤트 시작 (선택)

    @Column(name = "end_date")
    private LocalDate endDate;                  // 기간형 이벤트 종료 (선택)

    @Column(name = "delete_flag", nullable = false, columnDefinition = "boolean default false")
    private boolean deleteFlag;

    @Builder
    private EventNote(LocalDate eventDate, String summary, String description,
                      LocalDate startDate, LocalDate endDate) { ... }

    public void update(LocalDate eventDate, String summary, String description,
                       LocalDate startDate, LocalDate endDate) { ... }

    public void delete() { this.deleteFlag = true; }
}
```

초안 대비 변경 사항:

| 항목 | 초안 | 수정안 | 이유 |
|---|---|---|---|
| 기본 생성자 | `public` + `@AllArgsConstructor` | `PROTECTED`, 빌더는 생성자에만 | `id`·`deleteFlag`·audit 필드를 외부에서 넣지 못하게 막는다 |
| 상태 변경 | 없음 | `update()`·`delete()` | `@Setter` 금지 규약 (CLAUDE.md) |
| `deleteFlag` | `Boolean` (null 가능) | `boolean` + DB default false | null 이 섞이면 `@SQLRestriction` 에서 행이 누락된다 |
| `summary` / `description` 길이 | 기본 255 | 100 / `text` | 본문 길이 제한 해소. `@Size` 값과 반드시 같게 맞춘다 (드림렌즈 엔티티 주석 참조) |
| 인덱스 | 없음 | `event_date` | 날짜 조회의 주 경로 |
| audit | 없음 | `extends BaseEntity` | 요구사항 2 |

### 3-3. DDL

운영 프로파일은 `ddl-auto: none` 이라 Hibernate 가 테이블을 만들지 않는다. local/dev 의 `ddl-auto: update` 에만 기대면 **운영에서 테이블이 없어 500** 이 난다.
→ `sql/mart/event/tables/V69__event_note.sql` 을 추가해 `MartSchemaInitializer` 가 매 부팅마다 멱등하게 실행하도록 한다 (V-번호는 커밋 시점의 최신 번호 다음 값으로 다시 확인한다. 현재 최신은 V68).

```sql
CREATE TABLE IF NOT EXISTS event_note (
    id           BIGSERIAL    PRIMARY KEY,
    event_date   DATE         NOT NULL,
    summary      VARCHAR(100) NOT NULL,
    description  TEXT,
    start_date   DATE,
    end_date     DATE,
    delete_flag  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by   VARCHAR(50)  NOT NULL,
    created_at   TIMESTAMP    NOT NULL,
    updated_by   VARCHAR(50)  NOT NULL,
    updated_at   TIMESTAMP    NOT NULL,
    CONSTRAINT event_note_period_ck CHECK (
        (start_date IS NULL OR start_date <= event_date) AND
        (end_date   IS NULL OR event_date <= end_date)
    )
);
CREATE INDEX IF NOT EXISTS idx_event_note_event_date ON event_note (event_date) WHERE delete_flag = FALSE;
```

> 조회 조건은 `event_date` 하나뿐이라(Q2) 인덱스도 `event_date` 하나로 충분하다.

### 3-4. 날짜·시간과 타임존

| 컬럼 | Java | DB | 타임존 영향 |
|---|---|---|---|
| `event_date`·`start_date`·`end_date` | `LocalDate` | `DATE` | **없음.** 날짜만 담고 JDBC도 변환하지 않는다. `"2026-09-01"` → `2026-09-01` 그대로 저장된다. |
| `created_at`·`updated_at` | `LocalDateTime` | `TIMESTAMP` (without time zone) | **JVM 기본 타임존에 따라 달라진다.** Auditing 이 `LocalDateTime.now()` 를 JVM 시계로 찍고, 값은 오프셋 없이 그대로 저장된다. |

규칙:
- **JVM 타임존을 Asia/Seoul 로 고정한다.** Docker 이미지는 이미 `-Duser.timezone=Asia/Seoul`(`Dockerfile`·`Dockerfile.local`)이고, Jackson 도 `spring.jackson.time-zone: Asia/Seoul` 이다. IntelliJ `bootRun` 처럼 Docker 밖에서 실행하면 OS 타임존을 따르므로, 실행 구성 VM 옵션에 같은 값을 넣는다.
- **DB 쪽 시간 함수(`DEFAULT now()`, `CURRENT_DATE`)는 쓰지 않는다.** 값은 항상 애플리케이션(JPA Auditing)이 채운다. DB 서버 타임존이 JVM 과 달라도 결과가 흔들리지 않게 하기 위해서다.
- "오늘" 같은 기본값이 필요하면 `LocalDate.now(ZoneId.of("Asia/Seoul"))` 처럼 존을 명시한다.
- **프런트는 날짜를 `YYYY-MM-DD` 문자열로만 주고받는다.** `new Date().toISOString().slice(0, 10)` 은 UTC 기준이라 KST 00:00~08:59 에는 하루 전 날짜가 된다. 기존 코드(`DashboardPage`·`BatchManagementPage`·`AccumulatedEyesPage`)에 이 패턴이 남아 있으니 따라 하지 말고, `SmsQueueStatusCard` 의 로컬 날짜 헬퍼 방식을 쓴다. `new Date('2026-09-01')` 도 UTC 자정으로 해석되므로 날짜 비교·버킷 계산은 문자열로 한다.

## 4. 백엔드

### 4-1. 파일 구성

```
event/
├── entity/EventNote.java
├── repository/EventNoteRepository.java      # JpaRepository<EventNote, Long>
├── dto/EventNoteRequest.java               # 생성·수정 공용 (record + Bean Validation)
├── dto/EventNoteRow.java                   # 응답 (record, from(entity))
├── service/EventNoteService.java
└── controller/EventNoteController.java      # /api/event/notes  (GET=인증 사용자 · POST/PUT/DELETE=ADMIN)
common/
├── entity/BaseEntity.java
├── config/JpaAuditingConfig.java
└── dto/PageResponse.java                   # 신규 — 공용 페이징 응답
```

### 4-2. API

```
GET    /api/event/notes?from=2026-09-01&to=2026-09-30&page=0&size=20   # 페이징 목록 (관리 화면)
GET    /api/event/notes/all?from=2026-01-01&to=2026-12-31              # 기간 전체 목록, 페이징 없음 (차트)
GET    /api/event/notes/{id}                                           # 단건
POST   /api/event/notes                                                # 등록        (ADMIN · MEDICAL · MARKETING)
PUT    /api/event/notes/{id}                                           # 수정        (ADMIN · MEDICAL · MARKETING · 전체 필드 교체)
DELETE /api/event/notes/{id}                                           # 소프트 삭제 (ADMIN · MEDICAL · MARKETING · delete_flag = true)
```

> `/all` 은 `{id}` 보다 먼저 매칭된다(리터럴 경로 우선). `{id}` 는 `Long` 이라 `all` 이 id 로 해석되지 않는다.

**페이징 목록** (`GET /api/event/notes`)

- `from`/`to` 는 **선택** 값이다. 둘 다 없으면 전체 기간을 조회한다(관리 화면은 페이징되므로 상한이 없어도 된다). 하나만 주면 400.
- 정렬은 `event_date DESC, id DESC` 로 고정한다. `size` 는 최대 100 (`@Max`).
- 삭제된 행은 `@SQLRestriction` 때문에 `findById` 로도 조회되지 않으므로 수정·삭제 시 404 가 된다.

**차트용 전체 목록** (`GET /api/event/notes/all`)

- `from`/`to` **필수**. 범위 상한은 **3년 (1,096일)**. 주차 레포트가 3개 연도를 비교(`years=2024,2025,2026`)하므로 1년 상한으로는 부족하다.
- 정렬은 `event_date ASC` (차트 x축 순서).

### 4-3. 조회 쿼리 (`event_date` 기준 · Q2)

`@Query` 없이 Spring Data 파생 쿼리 메서드로 만든다. 정렬은 메서드 이름에 고정한다.

```java
Page<EventNote> findAllByOrderByEventDateDescIdDesc(Pageable pageable);                                         // 관리 화면 · 기간 없음
Page<EventNote> findByEventDateBetweenOrderByEventDateDescIdDesc(LocalDate from, LocalDate to, Pageable pageable); // 관리 화면 · 기간
List<EventNote> findByEventDateBetweenOrderByEventDateAscIdAsc(LocalDate from, LocalDate to);                      // 차트
```

(`between` 은 양 끝을 포함한다. `delete_flag = false` 조건은 `@SQLRestriction` 이 자동으로 붙인다.)

### 4-4. DTO

```java
public record EventNoteRequest(
        @NotNull LocalDate eventDate,
        @NotBlank @Size(max = 100) String summary,
        @Size(max = 5000) String description,
        LocalDate startDate,
        LocalDate endDate
) {
    @AssertTrue(message = "시작일 ≤ 발생일 ≤ 종료일 이어야 합니다.")
    boolean isPeriodValid() { ... }            // DB CHECK 와 같은 규칙
}

public record EventNoteRow(
        Long id, LocalDate eventDate, String summary, String description,
        LocalDate startDate, LocalDate endDate,
        String createdBy, LocalDateTime createdAt, String updatedBy, LocalDateTime updatedAt
) {
    public static EventNoteRow from(EventNote e) { ... }
}
```

### 4-5. 페이징 응답 — `PageResponse<T>` (신규 공용)

Spring `Page` 를 그대로 직렬화하지 않는다. Spring Data 3.3부터 `PageImpl` 직렬화 시 "구조가 바뀔 수 있다"는 경고가 나오고, 필드도 너무 많다.

```json
{
  "success": true,
  "data": {
    "content": [ { "id": 1, "eventDate": "2026-09-01", "summary": "추석 프로모션", ... } ],
    "page": 0, "size": 20, "totalElements": 57, "totalPages": 3
  }
}
```

```java
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {
    public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) { ... }
}
```

현재 코드베이스에는 서버 페이징이 없다(계정 관리는 전체를 내려받은 뒤 프런트에서 페이징). 이 DTO 가 첫 공용 페이징 응답이 된다.

### 4-6. 예외

| 상황 | 응답 |
|---|---|
| 없는 id / 삭제된 id | 404 — `ResponseStatusException(NOT_FOUND)` (계정 관리 `UserAdminService` 와 같은 방식 · `GlobalExceptionHandler` 가 이미 매핑) |
| 페이지 번호 < 0, size 가 1~100 밖 | 400 — `IllegalArgumentException` (기존 핸들러) |
| `from > to`, 범위 초과, from/to 중 하나만 전달 | 400 — 기존 `InvalidPeriodException` 재사용 |
| 검증 실패 | 400 + `errors` 필드 (기존 `ErrorResponse`) |

> 드림렌즈 서비스는 없는 id 에 `IllegalArgumentException` 을 던지는데, 이 방식은 따르지 않는다. 404 로 명확히 구분한다.

### 4-7. 보안 (`SecurityConfig`)

`/api/event/**` 는 기존 매처 어디에도 걸리지 않으므로 메서드별로 추가한다 (백엔드·프런트 게이트 대칭 유지).

```java
auth.requestMatchers(HttpMethod.GET, "/api/event/**").authenticated();
auth.requestMatchers("/api/event/**")                          // POST·PUT·DELETE
        .hasAnyAuthority("ROLE_ADMIN", "DEPT_MEDICAL", "DEPT_MARKETING");
```

- 순서가 중요하다: `GET` 매처를 먼저 둬야 한다. 반대로 두면 조회까지 ADMIN 전용이 된다.
- `DEPT_ALL` 을 넣지 않은 것이 DIRECTOR 를 빼는 장치다. ADMIN 도 `DEPT_ALL` 이므로 롤(`ROLE_ADMIN`)로 따로 허용한다.
- 관리 화면의 페이징 목록도 GET 이므로 로그인 사용자라면 호출할 수 있다. 화면(등록·수정 버튼)은 프런트에서 같은 조합(ADMIN · MEDICAL · MARKETING)으로 노출한다.

## 5. 프런트엔드

### 5-1. 파일 구성

```
api/event/index.ts                      # eventNoteApi: list(page) · listAll(from,to) · get · create · update · remove
hooks/event/useEventNotes.ts            # useAdminEventNotes(params) · useChartEventNotes(from,to) · useEventNoteMutations
pages/admin/EventNoteManagementPage.tsx # 관리 화면
pages/admin/event-note/EventNoteFormDialog.tsx
components/stats/EventNoteOverlay.tsx   # 차트 공용 오버레이 (ReferenceLine / ReferenceArea)
```

### 5-2. 관리 화면 (`/admin/event-notes`)

- `statsPages.ts` 에 `event-note-management` 정의 (section `admin`) → `navigation.ts` 의 상태 맵·부서 게이트(쓰기 권한과 같은 ADMIN · MEDICAL · MARKETING) 반영 → `pages/admin/routes.ts` 등록 (`router.tsx` 는 수정하지 않는다).
- 구성: 기간 필터(선택) + 테이블(발생일·요약·기간·작성자·수정일시) + 페이지네이션 + [등록] 버튼 → `EventNoteFormDialog` (react-hook-form + Zod, 검증 규칙은 서버와 같게) · 삭제 확인 다이얼로그 (계정 관리의 `DeleteConfirmDialog` 패턴).
- 페이지 상태(`page`, `from`, `to`)는 URL search param 에 둔다 → 새로고침·뒤로 가기를 해도 유지된다.
- mutation 이 성공하면 `['event-notes']` 쿼리 키 전체를 invalidate 한다 (관리 목록과 차트 캐시를 함께 갱신).

### 5-3. 차트 오버레이

- `EventNoteOverlay` 는 이벤트 배열과 x축 버킷 함수(월/ISO 주차/일)를 받아 다음을 그린다.
  - 단일 이벤트 → `<ReferenceLine x=… />` + 라벨/툴팁 (요약)
  - 기간 이벤트 → `<ReferenceArea x1=… x2=… />`
- **x축 매핑 주의**: 차트마다 x축 단위가 다르다 (월간 = `YYYY-MM`, 주차 = ISO 주차 `utils/isoWeek.ts`, 일간 = 날짜). 이벤트 날짜를 해당 차트의 버킷 키로 바꿔서 넘겨야 한다. 같은 버킷에 이벤트가 여러 개 있으면 마커 하나로 합치고 툴팁에 전부 나열한다.
- shadcn `ChartContainer` 안에서 쓰고, 색상은 `STATUS_COLORS.NEUTRAL` 계열로 데이터 계열 색(`CHART_PALETTE`)과 겹치지 않게 한다.

## 6. 테스트

| 대상 | 케이스 |
|---|---|
| `JpaAuditingConfig` | 로그인 상태로 저장하면 `created_by = updated_by = loginId`, 수정하면 `updated_*` 만 바뀌고 `created_*` 는 그대로, 비로그인이면 `"system"` |
| Repository (`@DataJpaTest`) | `event_date` 경계일 포함·전날/다음날 제외, 시작일·종료일은 조회 조건에 쓰지 않음, 소프트 삭제 제외, 정렬·페이징 건수 |
| Service | 범위 상한 초과 400, `from > to` 400, 없는 id 404, 삭제 후 재조회 404 |
| Controller (`@SpringBootTest` + 실제 JWT) | 비로그인 401, OVERSEAS_MARKETING·DIRECTOR 조회 200·쓰기 403, MEDICAL 등록·MARKETING 수정·ADMIN 삭제 200, `/all` 이 `{id}` 로 오매칭되지 않음, 검증 실패 400 + `errors.periodValid`, 없는 id 404 |
| API 문서 (`EventNoteDocsTest`) | 6개 엔드포인트 REST Docs → `openapi3.yaml` → Swagger UI(`/docs/`) 태그 `EventNote` · 서비스 목킹, 가상 데이터만 |
| 프런트 (Vitest) | Zod 기간 규칙, 오버레이 버킷 매핑(월·ISO 주차 경계, 같은 버킷 병합), `pageRegistry.test.ts` 라우트 정책 |

## 7. 구현 순서

1. `BaseEntity` + `JpaAuditingConfig` + audit 테스트
2. `EventNote` 엔티티 수정 + `V69__event_note.sql` DDL
3. Repository / DTO / `PageResponse` / Service / Controller + 테스트
4. `SecurityConfig` — `/api/event/**` 메서드별 매처 추가 (GET=인증 · 그 외=ADMIN)
5. 프런트 `api/event` · `hooks/event` · 관리 화면 + 메뉴·라우트 등록
6. `EventNoteOverlay` → 월간·주차 레포트에 적용 (Q5)
7. CLAUDE.md·AGENTS.md 의 통계 페이지 목록·API 설계·디렉터리 구조 갱신, 가이드(`_build/scan.mjs → gen.mjs`) 재생성
