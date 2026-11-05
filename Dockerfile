# ─────────────────────────────────────────────────────────────
# 앱 이미지 — 프론트(Vite) 빌드 결과를 백엔드(Spring Boot) jar 에 임베드해 한 컨테이너로 서빙한다.
#
#   DOCKER_BUILDKIT=1 docker compose up -d --build
# ─────────────────────────────────────────────────────────────

# Stage 1. Frontend build (Vite → frontend/dist)
FROM node:22-alpine AS frontend-builder
WORKDIR /workspace/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2. Backend build (Gradle bootJar)
FROM eclipse-temurin:21-jdk-jammy AS backend-builder
WORKDIR /workspace

# 1) 의존성 해석 — build.gradle 이 안 바뀌면 이 레이어는 캐시된다.
#    Gradle wrapper 와 settings.gradle 은 루트에 있고 :backend 서브프로젝트를 include 한다.
COPY settings.gradle gradlew ./
COPY gradle ./gradle
COPY backend/build.gradle backend/
RUN chmod +x gradlew
RUN --mount=type=cache,target=/root/.gradle,sharing=locked \
    ./gradlew --no-daemon :backend:dependencies || true

# 2) 소스 복사 후 openapi3(문서 테스트 → OpenAPI 스펙) → bootJar.
#    processResources 가 frontend/dist 를 static/ 으로 끌어온다.
COPY backend/ ./backend/
COPY --from=frontend-builder /workspace/frontend/dist /workspace/frontend/dist
RUN --mount=type=cache,target=/root/.gradle,sharing=locked \
    ./gradlew --no-daemon --build-cache clean :backend:openapi3 :backend:bootJar

# Stage 3. Runtime
FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --home /app app \
 && chown -R app:app /app

COPY --from=backend-builder /workspace/backend/build/libs/*-SNAPSHOT.jar /app/app.jar
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER app

ENV SERVER_PORT=18080 \
    JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Duser.timezone=Asia/Seoul"

EXPOSE 18080

ENTRYPOINT ["/app/entrypoint.sh"]
