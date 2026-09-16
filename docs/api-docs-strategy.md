# API 문서화 전략 — REST Docs + Swagger UI

작성일: 2026-09-15 · 상태: **회계 도메인 시범 구현 완료 (2026-09-15 · 로컬 검증 통과)**

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

## 9. 확장 계획

시범 성공 후 다른 도메인 도입 순서(권장):

1. **`report`** (`/api/report/weekly`, `/api/report/monthly`) — 파라미터 단순, 프런트 참조 빈도 높음
2. **`admin/batch`** (`POST /api/admin/batch/rerun` 등) — 운영 조작 API, 정확한 문서화 필요
3. **`overseas-marketing`** — 접수/통계/예약통계, MARKETING 부서 API 계약 공유용
4. **나머지 통계 도메인** (`reservation`, `exam`, `surgery`, `consultation`, ...) — 개별 필요 시점에 추가

각 도메인 도입 시 이 전략 문서에 순서·완료일만 갱신한다. 스코프 결정(SecurityConfig 매처, Bearer 예시 방식) 은 시범에서 확정한 규칙 재활용.

## 10. 참고

- Spring REST Docs: https://docs.spring.io/spring-restdocs/docs/current/reference/htmlsingle/
- restdocs-api-spec (Epages): https://github.com/ePages-de/restdocs-api-spec
- 이 프로젝트 컨벤션: `CLAUDE.md` · `AGENTS.md`
- 회계 도메인 마트·API 정본: `docs/accounting/mart-and-api.md`
