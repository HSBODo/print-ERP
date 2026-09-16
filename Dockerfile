# ─────────────────────────────────────────────────────────────
# Stage 1. Frontend build (Vite → frontend/dist)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /workspace/frontend

COPY frontend/package.json frontend/package-lock.json ./
# npm 캐시를 레이어 밖에 둔다 — package-lock 이 바뀌어도 받아 둔 tarball 을 재사용한다.
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci

COPY frontend/ ./
# 관리자 가이드 정적 파일 — prebuild 스크립트가 ../docs/_build_v2 를 public/guide 로 복사한다.
COPY docs/_build_v2 /workspace/docs/_build_v2
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage 2. Backend build (Gradle bootJar)
#   - build.gradle 의 processResources 가 ../frontend/dist 를
#     백엔드 static/ 으로 복사하므로 디렉터리 구조를 동일하게 유지한다.
#   - Nexus(사내 라이브러리) 인증은 BuildKit secret 으로 주입.
#     Jenkins 파이프라인의 secret id 규칙과 동일: nexus_id / nexus_pw
#
#     로컬 빌드:
#       DOCKER_BUILDKIT=1 docker build \
#         --secret id=nexus_id,env=NEXUS_USERNAME \
#         --secret id=nexus_pw,env=NEXUS_PASSWORD \
#         -t analytics .
# ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-jammy AS backend-builder
WORKDIR /workspace/backend

# ⚡ /root/.gradle 을 BuildKit 캐시 마운트로 뺀다.
#   레이어가 깨져도(= 소스 한 줄만 고쳐도) 이 디렉터리는 살아남아
#   ① 의존성 재다운로드와 ② 재컴파일을 둘 다 건너뛴다.
#   --build-cache 와 함께 써야 clean 뒤에도 컴파일 결과가 복원된다.
#   (BuildKit 은 이미 --mount=type=secret 때문에 필수라 새 요구사항이 아니다.)

# 1) 의존성만 먼저 해석 — build.gradle 이 안 바뀌면 이 레이어 자체가 캐시된다.
COPY backend/build.gradle backend/settings.gradle* backend/gradlew ./
COPY backend/gradle ./gradle
RUN chmod +x gradlew
RUN --mount=type=secret,id=nexus_id \
    --mount=type=secret,id=nexus_pw \
    --mount=type=cache,target=/root/.gradle,sharing=locked \
    ./gradlew --no-daemon dependencies \
        -PnexusUsername="$(cat /run/secrets/nexus_id 2>/dev/null || true)" \
        -PnexusPassword="$(cat /run/secrets/nexus_pw 2>/dev/null || true)" \
    || true

# 2) 소스 복사 후 test → openapi3 → bootJar.
#    - openapi3 를 도커 빌드 안에서 돌려 이미지가 self-contained 하게 한다
#      (Jenkins 파이프라인 스테이지 구성과 무관하게 스펙이 이미지에 포함됨).
#      openapi3 는 test 태스크의 스니펫을 필요로 하므로 -x test 는 뺀다.
#    - copyOpenApiToResources 가 openapi3 뒤에 자동 실행돼
#      src/main/resources/static/docs/openapi3.yaml 로 복사 → bootJar 에 임베드.
#    - clean 은 그대로 둔다(운영 빌드의 재현성). --build-cache 가
#      지운 산출물을 캐시에서 되살려 주므로 전체 재컴파일이 일어나지 않는다.
#    관련: docs/api-docs-strategy.md
COPY backend/ ./
COPY --from=frontend-builder /workspace/frontend/dist /workspace/frontend/dist
RUN --mount=type=secret,id=nexus_id \
    --mount=type=secret,id=nexus_pw \
    --mount=type=cache,target=/root/.gradle,sharing=locked \
    ./gradlew --no-daemon --build-cache clean openapi3 bootJar \
        -PnexusUsername="$(cat /run/secrets/nexus_id 2>/dev/null || true)" \
        -PnexusPassword="$(cat /run/secrets/nexus_pw 2>/dev/null || true)"

# ─────────────────────────────────────────────────────────────
# Stage 3. Runtime
# ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app

# 레거시 MSSQL(jtds) 등 TLSv1/1.1 만 지원하는 원격지 대비 — Jenkins 파이프라인과 동일 정책.
RUN sed -i 's/TLSv1, TLSv1.1,//g' $JAVA_HOME/conf/security/java.security

# 레거시 홈페이지 MariaDB SSH 터널 (계정+패스워드 인증) — SSH_HOST 가 설정된 경우 entrypoint 가
# 컨테이너 안에서 sshpass 로 터널을 연다. 사이드카 컨테이너·서버측 systemd 없이 자립 동작.
# openssh-client / sshpass / netcat-openbsd 세 패키지 합쳐 약 ~2MB.
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssh-client sshpass netcat-openbsd \
    curl ca-certificates gnupg && \
    curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | bash && \
    apt-get update && apt-get install -y infisical && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd --system app && useradd --system --gid app --home /app app \
 && mkdir -p /app/.cache/stats \
 && chown -R app:app /app

COPY --from=backend-builder /workspace/backend/build/libs/*-SNAPSHOT.jar /app/app.jar
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER app

ENV SERVER_PORT=18080 \
    STATS_CACHE_DIR=/app/.cache/stats \
    JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Duser.timezone=Asia/Seoul"

EXPOSE 18080

ENTRYPOINT ["sh", "-c", "infisical run --projectId=$INFISICAL_PROJECT_ID --env=$INFISICAL_ENV -- /app/entrypoint.sh"]
