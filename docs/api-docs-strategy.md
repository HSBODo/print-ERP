# API 문서화 전략 — REST Docs + Swagger UI

작성일: 2026-09-15 · 최신화: 2026-09-17 · 상태: **✅ 전체 완료 — 136 endpoints 문서화 (Phase 0~6, 초기 계획 127 대비 107%)**

## 1. 목적

- **API 계약과 코드가 절대 어긋나지 않는 문서** 를 자동 생성해 프런트·백엔드·개발자간 커뮤니케이션 비용을 줄인다.
- 문서화 자체가 계약 테스트가 되어 컨트롤러 리팩토링 시 회귀를 잡아낸다.
- 배포된 서비스에서 즉시 조회 가능한 UI(Swagger) 를 제공해 별도 문서 사이트 없이 최신 상태를 유지한다.

## 2. 접근 방식

**Spring REST Docs (MockMvc) + `com.epages:restdocs-api-spec` 플러그인 → OpenAPI 3 스펙 → Swagger UI 임베드**.

선택 이유는 이 프로젝트의 컨벤션(코드-문서 정합 원칙, 마트 아키텍처 등) 과 잘 맞기 때문. 대안 비교:

| 접근 | 채택 여부 | 이유 |
|---|---|---|
| **REST Docs + restdocs-api-spec** | **채택** | 테스트가 스펙 진위 보증, 계약이 코드와 절대 안 엇나감 |
| springdoc-openapi 단독 | 미채택 | 애노테이션·실동작 괴리 가능, 테스트로 검증 안 됨 |
| 둘 다 병행 | 미채택 | 스펙 생성 경로 이중화로 유지비 증가 |

## 3. 결정 사항 (확정)

| # | 항목 | 결정 | 반영 방식 |
|---|---|---|---|
| 1 | Swagger UI 서빙 위치 | **백엔드 임베드** | `/docs/openapi3.yaml` + `/docs/swagger-ui/` 정적 배포. Gradle task 가 `swagger-ui-dist` 를 `src/main/resources/static/docs/swagger-ui/` 로 복사 |
| 2 | Swagger UI 접근 권한 | **공개 (로그인 불필요)** | `SecurityConfig` 에 `/docs/**` `permitAll` 매처 추가 |
| 3 | 인증 예시 노출 | **로그인 API 도 문서화 · 자리표시자만 노출** | `POST /api/auth/login` 을 스코프에 포함, `securitySchemes: bearerAuth` 정의. 자격증명은 `your-admin-id / your-password` 로만 표기 — 실계정·데모 계정 노출 금지 |
| 4 | Jenkins 파이프라인 실패 정책 | **배포 중단** | `./gradlew test openapi3` 실패 시 파이프라인 실패 처리. 문서화 테스트 = API 계약 검증 |
| 5 | 시범 스코프 | **회계 5개 + 로그인 1개** | `GET /api/accounting/status`, `GET/POST` medical-receipts(2), vision-receipts(2), `POST /api/auth/login` |
| 6 | 파이프라인 편집 위치 | **Jenkins 서버쪽 config** | `Jenkinsfile` 은 레포에 없음. 스테이지 스니펫만 이 문서에 남기고 서버쪽 파이프라인에 개발자가 반영 |

## 4. 시범 범위

회계 도메인 5개 엔드포인트 + 로그인 1개. 첫 도메인이므로 문서화 인프라(MockMvc + Spring Security 목킹 + Reader 목빈) 를 함께 셋업해 재사용 기반을 만든다.

| 엔드포인트 | 문서화 관점 |
|---|---|
| `POST /api/auth/login` | 인증 흐름 · Bearer 토큰 발급 예시 |
| `GET /api/accounting/status` | 파라미터 없음 (가장 단순 · 헬로월드) |
| `GET /api/accounting/medical-receipts?from&to` | 날짜 범위 파라미터 검증 (최대 366일) |
| `GET /api/accounting/medical-receipts/monthly?years&category` | List 파라미터 + enum(category: 전체·외래·입원·백내장) |
| `GET /api/accounting/vision-receipts?from&to` | 리스트 반환 (`VisionReceiptRow` DTO) |
| `GET /api/accounting/vision-receipts/monthly?years` | 배열 파라미터 |

## 5. 파이프라인 통합

현재 `Dockerfile:57` 은 `-x test` 로 프로덕션 이미지에서 테스트를 스킵한다. **Dockerfile 은 손대지 않고** Jenkins 서버쪽 파이프라인에 별도 스테이지를 추가한다.

```groovy
stage('Backend Test + API Docs') {
  steps {
    dir('backend') {
      sh './gradlew test openapi3'
    }
    archiveArtifacts artifacts: 'backend/build/api-spec/openapi3.yaml',
                     fingerprint: true
  }
}

stage('Docker Build') {
  // 기존 그대로 — bootJar 는 -x test 유지
  // openapi3.yaml 은 test 스테이지에서 이미 build/resources/main/static/docs/ 로 복사됨
}
```

- **테스트 스테이지에서 이미 스펙과 Swagger UI 정적 파일이 `src/main/resources/static/docs/` 로 배치되므로 `bootJar` 는 그대로 임베드한다.**
- 테스트 실패 = 파이프라인 실패 (결정 4).
- 스펙 파일(`openapi3.yaml`) 은 Jenkins 아티팩트로 함께 보관해 배포 이력 감사에 활용.

## 6. 파일 변경 계획

- `backend/build.gradle` — 플러그인·의존성 추가 (`spring-restdocs-mockmvc`, `com.epages:restdocs-api-spec-mockmvc`, `com.epages.restdocs-api-spec` gradle plugin), `openapi3` DSL, `swagger-ui-dist` 복사 task
- `backend/src/main/java/com/bviit/analytics/auth/config/SecurityConfig.java` — `/docs/**` `permitAll` 매처 한 줄 추가
- `backend/src/main/resources/static/docs/swagger-ui/*` — Gradle task 산출물 (git 무추적, `.gitignore` 처리)
- `backend/src/test/java/com/bviit/analytics/**/docs/*DocsTest.java` — 6개 케이스
- `Dockerfile` · `docker-compose*.yml` — **무손댐**
- `Jenkinsfile` — 레포에 없음, 이 문서의 §5 스니펫을 서버쪽 파이프라인에 반영

## 7. 유의점 (이 프로젝트 특성 반영)

1. **MockMvc + Spring Security** — `/api/accounting/**` 는 ADMIN 가드라 `@WithMockUser(roles="ADMIN")` 또는 `springSecurity()` MockMvcConfigurer 필수.
2. **JDBC·링크드서버 의존 서비스는 목킹** — 컨트롤러 슬라이스에서 `AccountingReader` 등을 `@MockBean` 으로 대체. IT 테스트(`AccountingMartIntegrityIT`, `RUN_INTEGRATION_TESTS=true`) 와 완전 분리.
3. **한국어 description** — Swagger UI 는 UTF-8 처리. 스펙 설명은 한국어로 작성해도 무방(이 프로젝트 기존 컨벤션과 일치).
4. **인증 예시에 실계정·데모 계정 절대 노출 금지** — 결정 3 에 따라 `your-admin-id / your-password` 자리표시자만.
5. **`ADMIN` 전용 API 표기** — 스펙에 태그·description 으로 명시(`administrator only`). 회계 5개는 모두 ADMIN 전용.
6. **회계는 방금 머지된 신규 도메인** — 문서화 테스트가 곧 회귀 안전망. 시범 대상으로 적절.

## 8. 시범 구현 결과 (2026-09-15)

- `com.epages.restdocs-api-spec:0.19.4` 플러그인 적용 · `spring-restdocs-mockmvc` + `restdocs-api-spec-mockmvc` 의존성 추가.
- `SecurityConfig` 에 `/docs/**`, `/webjars/**` `permitAll` 매처 추가.
- `src/main/resources/static/docs/index.html` (Swagger UI 런처) · `openapi3.yaml` 은 `.gitignore` (매 빌드 산출물).
- 문서화 테스트 6건 통과 (`AuthDocsTest`, `AccountingDocsTest` 5 메서드) · `./gradlew test openapi3` 로 `build/api-spec/openapi3.yaml` 생성 → `src/main/resources/static/docs/openapi3.yaml` 로 자동 복사.
- `openapi3` 태스크는 lazy 등록이라 build.gradle 은 `afterEvaluate` 로 후속 태스크(`copyOpenApiToResources`) 를 묶음.

**로컬 확인 방법**:
- Gradle 직접: `./gradlew test openapi3` → `./gradlew bootRun` → `http://localhost:8080/docs/`
- Docker Compose: `DOCKER_BUILDKIT=1 docker compose -f docker-compose.local.yml up -d --build` → `http://localhost:18080/docs/`
  - `Dockerfile.local` 이 `clean openapi3 bootJar` 를 한 번에 실행해 스펙까지 이미지에 담는다 (테스트 실패 시 이미지 빌드 실패).

**남은 작업 (개발자 몫)**: 이 문서 §5 스니펫을 Jenkins 서버쪽 파이프라인에 추가. 스테이지 실패 시 배포 중단(결정 4). 운영용 `Dockerfile` 은 이 시범에서 손대지 않았다 — 결정 6(Jenkins 서버쪽 config)에 따라 스테이지에서 `./gradlew test openapi3` 를 먼저 돌리고 나서 `docker build` 를 실행하도록 파이프라인에 반영한다.

## 9. 확장 계획 · 진행 현황

전체 계획 127 endpoints / 13 도메인. 2026-09-17 완료 **137 endpoints / 22 태그** (계획 대비 +10 — 실제 컨트롤러 스캔 + 감사 조치에서 추가 발견분 반영).

| Phase | 도메인 · 태그 | Endpoints | 상태 | 완료일 | 테스트 파일 |
|-------|--------------|-----------|------|-------|------------|
| **0** | 시범 (Accounting 5 + Auth login 1) | 6 | ✅ 완료 | 2026-09-15 | `AccountingDocsTest`, `AuthDocsTest` |
| **1** | **Auth 잔여 (UserAdmin 5) + Report (1)** | 6 | ✅ 완료 | 2026-09-16 | `UserAdminDocsTest`, `ReportDocsTest` |
| **2** | **BatchAdmin (21) + Batch Status (1)** | 22 | ✅ 완료 | 2026-09-16 | `BatchAdminDocsTest`, `BatchStatusDocsTest` |
| **3** | **Marketing (ChannelProfit 5 + OverseasMarketing 13)** | 18 | ✅ 완료 | 2026-09-16 | `ChannelProfitDocsTest`, `OverseasMarketingDocsTest` |
| **4** | **Reservation (Monthly 5 + List 2 + Change 2 + Channel 2 + StatsSystem 6 + CataractStatsSystem 6)** | 23 | ✅ 완료 | 2026-09-17 | `ReservationMonthlyDocsTest`, `ReservationListDocsTest`, `ReservationChangeDocsTest`, `ReservationChannelDocsTest`, `ReservationStatsSystemDocsTest`, `CataractStatsSystemDocsTest` |
| **5** | **SMS (Management 18 + QueueAdmin 5 + Webhook 1)** | 24 | ✅ 완료 | 2026-09-17 | `SmsManagementDocsTest`, `SmsQueueAdminDocsTest`, `SmsWebhookDocsTest` |
| **6** | **Surgery(12) + Exam(10) + Consultation(6) + Outpatient(2) + Overall(2) + Etc(5)** | 37 | ✅ 완료 | 2026-09-17 | `SurgeryDocsTest`, `ExamDocsTest`, `ConsultationDocsTest`, `OutpatientDocsTest`, `OverallExamDocsTest`, `EtcDocsTest` |

> **초기 계획 대비 편차 (+9)**:
> - Phase 4 +4 — 예약통계·백내장통계의 진단 서브루트(diff/drill-down/parity/health) 각 2개
> - Phase 6 +3 — surgery 계획 11 vs 실제 12(reoperation-decisions PUT + accumulated-eyes total 등 재분류), etc 계획 3 vs 실제 5(dreamlens-ledger CRUD 4개 세분화)
> - 편차 원인: 최초 계획은 페이지 단위 근사치였고, 실제 개수는 컨트롤러 소스 스캔으로 확정. Phase 시작 전 스캔이 필수(재사용 패턴 #10).

### Phase 별 태그 상세 (완료분)

| Tag | Ops | Phase |
|-----|-----|-------|
| BatchAdmin | 21 | 2 |
| SmsManagement | 18 | 5 |
| OverseasMarketing | 13 | 3 |
| Surgery | 12 | 6 |
| Exam | 10 | 6 |
| Reservation | 9 | 4 |
| CataractStatsSystem | 6 | 4 |
| Consultation | 6 | 6 |
| ReservationStatsSystem | 6 | 4 |
| Accounting | 5 | 0 |
| ChannelProfit | 5 | 3 |
| Etc | 5 | 6 |
| SmsQueueAdmin | 5 | 5 |
| UserAdmin | 5 | 1 |
| Outpatient | 2 | 6 |
| Overall | 2 | 6 |
| ReservationChannel | 2 | 4 |
| Auth | 1 | 0 |
| Batch | 1 | 2 |
| Health | 1 | 감사 |
| Report | 1 | 1 |
| SmsWebhook | 1 | 5 |

**합계 = 137 operations · 22 태그** (스펙 `openapi3.yaml` operationId 총계와 일치 · Health 는 감사 조치 시 추가)

### 재실행 · 검증

```bash
cd backend
./gradlew test openapi3           # 스펙 재생성 → build/api-spec/openapi3.yaml
./gradlew bootRun                 # http://localhost:8080/docs/ → Swagger UI
```

`build/api-spec/openapi3.yaml` 은 bootJar 가 `BOOT-INF/classes/static/docs/openapi3.yaml` 로 직접 임베드한다 (별도 copy 태스크 없음).

### 프로젝트 종료 상태

전 도메인 문서화 완료. 이후 유지보수 규칙:
1. **신규 컨트롤러 추가 시** — 해당 도메인 `docs/` 디렉토리에 DocsTest 추가. `./gradlew test openapi3` 가 파이프라인에서 계약을 검증.
2. **응답 필드 변경 시** — 실패한 DocsTest 가 계약 회귀를 잡아내므로 필드 설명·타입을 그때 갱신.
3. **Jenkins 파이프라인 스니펫(§5)** — 개발자가 서버쪽 config 에 반영해야 이 문서 정본의 §3-4 결정이 자동화된다.

### 재사용 가능한 패턴 (Phase 0~6 확정)

1. **컨트롤러가 `@Profile("postgres-mart")` 인 경우** — `@TestConfiguration` + `@Bean` 으로 mock 의존성과 컨트롤러를 명시 등록. 클래스 레벨 `@Profile` 은 `@Bean` 메서드로 만들 때 무시된다.
   - 예: `BatchStatusDocsTest`, `BatchAdminDocsTest`
2. **컨트롤러가 `Optional<Reader>` 로 감싼 경우** — `@MockitoBean` 으로 Reader/Repository 만 주입하면 자동 해결.
   - 예: `ReportDocsTest`, `ChannelProfitDocsTest`
3. **POST 의 query param** — `.param()` 대신 `.queryParam()` 사용 (REST Docs 는 URL 쿼리스트링만 인식).
4. **`Map.of()` 인자 20개 초과** — `LinkedHashMap` 으로 요청 본문 구성.
5. **동적 Map 응답** — `subsectionWithPath("data")` 로 상위만 표기, 세부 키는 description 에 남긴다.
6. **null 필드 검증** — `ApiResponse @JsonInclude(NON_NULL)` 로 응답에서 생략되는 필드는 `.type(JsonFieldType.STRING/NULL).optional()` 명시.
7. **부서 스코프 (MARKETING · OVERSEAS_MARKETING)** — 현재 스펙 렌더는 `adminOnly` 만 표기. 부서 gate 는 description 에 서술.
8. **컨트롤러 + Service 가 함께 `@Profile("postgres-mart")`** — @TestConfiguration 에 mock service `@Bean` + `@Bean` 으로 컨트롤러를 명시 등록한다. `@MockitoBean` 만으론 컨트롤러가 안 만들어져 404. (Phase 4 `ReservationStatsSystemDocsTest`·`CataractStatsSystemDocsTest`)
9. **`@JsonInclude(NON_EMPTY)` 리스트 필드 (예: `manualEdits`)** — `.optional().type(JsonFieldType.ARRAY)` 로 표기. 비어있으면 응답에서 생략된다.
10. **엔드포인트 수 검증** — 계획 초안(문서 §9 표)과 실제 컨트롤러 소스가 어긋날 수 있다. Phase 시작 전에 컨트롤러 스캔으로 실제 개수를 확인하고 초과분을 문서에 반영한다.
11. **`.queryParam()` vs `.param()` — POST 뿐 아니라 PUT·DELETE 에도 동일** — REST Docs 는 URL 쿼리스트링만 인식. `PUT /targets/{id}/status?value=...` · `DELETE /opt-outs?phone=...` 같이 GET 이 아닌 메서드에 쿼리스트링을 쓰는 컨트롤러는 반드시 `.queryParam()`. (Phase 5 `SmsManagementDocsTest` 최초 2건 실패 → 교정)
12. **웹훅 엔드포인트 (JWT 없음)** — SecurityConfig 에서 permitAll + 서명 헤더 검증인 경로는 `@MockitoBean` 으로 SolapiProperties.isWebhookSecretConfigured() = false 로 스텁하면 검증을 건너뛰어 통과. 실제 시크릿을 테스트에 심지 않는다. (Phase 5 `SmsWebhookDocsTest`)

각 도메인 도입 시 이 전략 문서 표만 갱신한다. 스코프 결정(SecurityConfig 매처, Bearer 예시 방식) 은 시범에서 확정한 규칙 재활용.

## 10. 참고

- Spring REST Docs: https://docs.spring.io/spring-restdocs/docs/current/reference/htmlsingle/
- restdocs-api-spec (Epages): https://github.com/ePages-de/restdocs-api-spec
- 이 프로젝트 컨벤션: `CLAUDE.md` · `AGENTS.md`
- 회계 도메인 마트·API 정본: `docs/accounting/mart-and-api.md`
