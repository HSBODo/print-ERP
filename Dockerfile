# ─────────────────────────────────────────────────────────────
# Stage 1. Frontend build (Vite → frontend/dist)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /workspace/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
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

# 1) 의존성만 먼저 해석 (gradle 캐시 레이어 재사용) — 소스 변경 시 재다운로드 스킵.
COPY backend/build.gradle backend/settings.gradle* backend/gradlew ./
COPY backend/gradle ./gradle
RUN chmod +x gradlew
RUN --mount=type=secret,id=nexus_id \
    --mount=type=secret,id=nexus_pw \
    ./gradlew --no-daemon dependencies \
        -PnexusUsername="$(cat /run/secrets/nexus_id 2>/dev/null || true)" \
        -PnexusPassword="$(cat /run/secrets/nexus_pw 2>/dev/null || true)" \
    || true

# 2) 소스 복사 후 bootJar 빌드.
COPY backend/ ./
COPY --from=frontend-builder /workspace/frontend/dist /workspace/frontend/dist
RUN --mount=type=secret,id=nexus_id \
    --mount=type=secret,id=nexus_pw \
    ./gradlew --no-daemon clean bootJar -x test \
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
    apt-get install -y --no-install-recommends openssh-client sshpass netcat-openbsd && \
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

ENTRYPOINT ["/app/entrypoint.sh"]
