# 배포 가이드 (전략 · 로컬 실행 · 운영 반영)

> 구 `deployment-strategy.md` · `deployment-local.md` · `deployment-release.md` 3종을 하나로 합친 문서.
> §1 전략·CI → §2 로컬 개발 실행 → §3 운영 배포 순서로 읽으면 된다.

---

# 1. 배포 전략 · CI

## 1.1 목표

내부 소규모 사용 제품이므로 완전 자동 배포 대신 **자동 검증 + 수동 배포 승인** 전략을 쓴다.

1. `dev` 는 개발/통합 브랜치
2. `main` 은 배포 확정 브랜치
3. 코드 품질 검증은 GitHub Actions 가 자동 수행
4. `dev -> main` 승격은 GitHub Actions 버튼으로 수행
5. 운영 반영은 사람이 확인 후 수동 진행

## 1.2 브랜치 전략

| 브랜치 | 역할 |
|---|---|
| `dev` | 일상 개발·수정·통합. push / PR 시 자동 CI |
| `main` | 배포 후보. push 시 자동으로 배포용 아티팩트 생성. 운영 반영은 수동 |

## 1.3 승격 자동화 — `.github/workflows/promote-dev-to-main.yml`

- GitHub Actions 에서 `Promote Dev to Main` 수동 실행
- 기본값은 `dev` 최신 커밋 승격. 특정 `dev` 커밋 SHA 지정 가능
- 승격 대상 커밋이 `dev` 에 포함돼 있어야 하고, `main` 이 fast-forward 가능해야 함
- 승격 후 `main` push → `Release Package` workflow 자동 실행

`git push origin dev:main` 을 직접 치지 않아도 GitHub 안에서 일관된 승격 흐름을 유지한다.

## 1.4 CI — `.github/workflows/ci.yml`

자동 실행 대상: `dev` push · `main` push · `dev`/`main` 대상 PR

| 영역 | 실행 항목 |
|---|---|
| Frontend | `npm ci` · `npm run lint` · `npm run test` · `npm run build` |
| Backend | `./gradlew test` |

## 1.5 반자동 배포 — `.github/workflows/release-package.yml`

- `main` push 시 자동 실행 (수동 실행도 가능)
- 생성물: 프론트 빌드가 포함된 Spring Boot jar · `backend.env.example` · 이 배포 문서
- 운영자는 artifact 를 내려받아 내부 PC 에 적용

## 1.6 운영 배포 구조

운영은 `Vite dev server` 를 쓰지 않는다.

1. 프론트엔드 `dist` 빌드
2. 빌드 결과를 백엔드 jar 내부 정적 리소스로 포함
3. Spring Boot jar 한 개로 실행

브라우저는 Spring Boot 서버 하나에 접속한다 — `/api/**` 는 백엔드 API, `/` 및 프런트 라우트는 정적 파일.

## 1.7 권장 운영 흐름

1. `dev` 에서 작업 → 2. CI 통과 확인 → 3. `Promote Dev to Main` 실행 → 4. `main` 승격 확인
→ 5. `Release Package` artifact 생성 확인 → 6. 운영 PC 수동 반영 → 7. 이상 없으면 그 버전을 운영 기준점으로 유지

## 1.8 지금 하지 않는 것

운영 서버 자동 배포 · 무중단 배포 · 자동 롤백 · 모니터링/알림 연동 · 컨테이너 오케스트레이션.
사용 빈도와 운영 부담을 고려해 필요해질 때 추가한다.

---

# 2. 로컬 개발 실행

개발/검증용으로 로컬 PC 에서 백엔드(Spring Boot)와 프론트엔드(Vite)를 각각 실행한다.

## 2.1 사전 준비

| 항목 | 버전 | 확인 명령 |
| --- | --- | --- |
| Java (JDK) | 21 이상 | `java -version` |
| Node.js | 20 이상 | `node -v` |
| npm | 10 이상 | `npm -v` |

### 🔑 사내 Nexus 계정 — 없으면 백엔드 빌드 자체가 안 된다

`build.gradle` 의 `com.visuworks.lib:slack-logger` 가 사내 Nexus 인증을 요구한다.
계정이 없으면 도커든 로컬이든 **컴파일 단계에서 실패**한다.

```properties
# ~/.gradle/gradle.properties  (리포 밖 — 커밋 안 됨)
nexusUsername=<아이디>
nexusPassword=<비밀번호>
```

리포 안에는 `gradle.properties` 를 만들지 말 것(`.gitignore` 로 막혀 있지만 원칙이 그렇다).
**도커 빌드는 이 파일을 못 읽으므로** BuildKit secret 을 쓴다:

```bash
DOCKER_BUILDKIT=1 docker build \
  --secret id=nexus_id,env=NEXUS_USERNAME \
  --secret id=nexus_pw,env=NEXUS_PASSWORD \
  -t bviit-analytics:latest .
```

테스트 실행 시에도 필요하다: `./gradlew test -PnexusUsername=... -PnexusPassword=...`

## 2.2 폴더 구조

```
프로젝트 루트\
├── backend\
│   ├── .env                 ← DB 접속정보 (git 미포함)
│   └── ...
├── frontend\
│   ├── .env                 ← 프론트 설정 (git 미포함)
│   └── ...
├── 서버시작.bat              ← 더블클릭으로 실행
└── 서버종료.bat              ← 더블클릭으로 종료
```

## 2.3 환경변수

### backend/.env

git 에 포함되지 않는다. 최초 1회 직접 생성한다.

```
APP_JWT_SECRET=32자-이상의-임의-시크릿
APP_SEED_ENABLED=true
APP_SEED_ADMIN_LOGIN_ID=admin
APP_SEED_ADMIN_PASSWORD=로컬-로그인-비밀번호
STATS_DB_URL=jdbc:jtds:sqlserver://220.85.109.247:1433/SOFTCRM
STATS_DB_USERNAME=계정명
STATS_DB_PASSWORD=비밀번호
```

| 변수 | 설명 |
| --- | --- |
| APP_JWT_SECRET | JWT 서명 키. 32자 이상 필수 |
| APP_SEED_ENABLED | 로컬 H2 인증 DB 에 관리자 계정을 만들지 여부 |
| APP_SEED_ADMIN_LOGIN_ID | 로컬 관리자 로그인 ID |
| APP_SEED_ADMIN_PASSWORD | 로컬 관리자 비밀번호 |
| STATS_DB_URL | MSSQL 접속 주소 (SOFTCRM) |
| STATS_DB_USERNAME | DB 읽기 전용 계정 |
| STATS_DB_PASSWORD | DB 비밀번호 |

> **주의**: SELECT 만 가능한 읽기 전용 계정을 사용할 것. INSERT/UPDATE/DELETE 권한이 없는 계정이 안전하다.

> 예약자 리스트_홈페이지 화면과 예약 마트 배치는 홈페이지 소스(**`HOMEPAGE_DATASOURCE_URL`**)를
> 추가로 요구한다. URL 접두사(`jdbc:sqlite:` / `jdbc:mariadb:`)가 방언·드라이버·실시간 여부를 모두 결정하며,
> 값이 비면 해당 API 만 503 이고 앱 기동은 정상이다.
> 설정 방법·SSH 터널 구성은 [databatch/legacy-homepage-source-strategy.md](databatch/legacy-homepage-source-strategy.md) §2 참조.
>
> ⚠️ 운영에 SSH 터널 사이드카 구조를 쓰지 말 것 — 터널이 끊기면 그 메뉴만 503 이 된다.
> 운영은 배치가 `mart_list_reservation_homepage` 에 적재한 값을 읽는다.

### frontend/.env

별도 설정 없이 동작한다(Vite 프록시 `/api` → 백엔드). 브라우저 목업(MSW)은 제거되어 프론트는
항상 실제 백엔드 API 를 쓴다. 백엔드 포트만 바꾸려면 `VITE_BACKEND_URL` 을 조정한다(서버시작.bat 가 자동 설정).

## 2.4 실행

`서버시작.bat` 더블클릭 시 자동으로 수행되는 작업:

1. 기존 포트(18080, 15173) 프로세스 종료
2. `backend/.env` 환경변수 로드
3. 백엔드 실행 (포트 18080, mssql 프로파일)
4. 프론트엔드 개발 서버 실행 (포트 15173)

접속: http://localhost:15173 · 로그인 계정은 `APP_SEED_ADMIN_LOGIN_ID / APP_SEED_ADMIN_PASSWORD`.
종료는 `서버종료.bat` 또는 Ctrl+C.

> 이 방식은 운영 배포용이 아니라 개발/검증용 실행 흐름이다.

### PC 부팅 시 자동 실행 (선택)

`Win + R` → `shell:startup` → 열린 폴더에 `서버시작.bat` 바로가기 생성.

## 2.5 문제 해결

**"데이터를 불러오지 못했습니다" 에러**

- `backend/.env` 존재 확인 · DB 접속정보 확인
- MSSQL 서버(220.85.109.247) 네트워크 접근 가능 여부 · 방화벽 1433 포트

**포트 충돌**

```
netstat -aon | findstr :18080
netstat -aon | findstr :15173
```

사용 중인 포트가 있으면 `서버종료.bat` 으로 정리 후 재시작.

**로그인 안 됨**

- `APP_SEED_ENABLED=true` 인지, `APP_SEED_ADMIN_PASSWORD` 가 비어 있지 않은지 확인
- 최초 실행 시 H2 인메모리 DB 에 로컬 관리자 계정이 자동 생성됨
- 백엔드가 완전히 뜰 때까지 10~15초 대기 후 로그인

**백엔드만 재시작**

```bash
cd <프로젝트 루트>\backend
set STATS_DB_URL=jdbc:jtds:sqlserver://220.85.109.247:1433/SOFTCRM
set STATS_DB_USERNAME=계정명
set STATS_DB_PASSWORD=비밀번호
gradlew.bat bootRun --args="--spring.profiles.active=mssql"
```

## 2.6 포트

| 서비스 | 포트 | 용도 |
| --- | --- | --- |
| Backend (Spring Boot) | 18080 | REST API |
| Frontend (Vite) | 15173 | 웹 UI |
| MSSQL (운영 DB) | 1433 | 통계 데이터 조회 (READ ONLY) |
| H2 (내장 DB) | - | 인증/사용자 관리 (인메모리) |

## 2.7 보안 주의사항

- `backend/.env` 를 공유하지 말 것. `.gitignore` 로 커밋 제외돼 있다
- 운영/외부 노출 환경에서는 `APP_SEED_ENABLED=false`, `APP_JWT_SECRET` 은 환경별로 다른 임의 문자열
- DB 계정은 읽기 전용(SELECT만)
- 외부 네트워크 접근 시 방화벽 설정 확인

---

# 3. 운영 배포

`main` 브랜치에서 생성된 GitHub Actions 배포 아티팩트를 내부 PC 에 적용하는 절차.
운영은 `npm run dev` 가 아니라 **프론트 빌드가 포함된 Spring Boot jar 실행**이 기준이다.

## 3.1 배포 파일 구성

`Release Package` artifact 에 보통 포함되는 파일:

- `analytics-*.jar`
- `backend.env.example`
- `deployment.md` (이 문서)

## 3.2 서버 준비

Java 21 이상. 확인: `java -version`

## 3.3 환경변수 파일

artifact 의 `backend.env.example` 을 참고해 같은 폴더에 `.env` 를 만든다.

```env
STATS_DB_URL=jdbc:jtds:sqlserver://220.85.109.247:1433/SOFTCRM
STATS_DB_USERNAME=readonly_user
STATS_DB_PASSWORD=change-me
```

읽기 전용 계정을 쓰고, `.env` 는 Git 에 올리지 않는다.

## 3.4 실행 (Windows PowerShell)

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $name, $value = $_ -split '=', 2
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}

$env:SPRING_PROFILES_ACTIVE = 'mssql'
java -jar .\analytics-0.0.1-SNAPSHOT.jar
```

접속: `http://localhost:18080`
운영에는 기본 계정을 두지 않는다. 관리자 계정은 운영 절차에 따라 별도 생성하고 `APP_SEED_ENABLED=false` 유지.

종료는 실행 중인 터미널에서 `Ctrl + C`.

## 3.5 운영 배포 순서

1. GitHub Actions `Promote Dev to Main` 실행
2. `Release Package` workflow 완료 확인
3. `main` 기준 `Release Package` artifact 다운로드
4. 운영 폴더에 압축 해제
5. `.env` 준비
6. jar 실행
7. 로그인 및 핵심 화면 확인

## 3.6 롤백

가장 간단한 방법은 이전 artifact 를 따로 보관하는 것이다.
문제 발생 시 ① 현재 jar 종료 → ② 이전 정상 artifact 로 교체 → ③ 같은 방식으로 재실행.
