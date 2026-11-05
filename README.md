# App Template

Spring Boot 3.5 (Java 21) + React 19 (Vite 8) 관리자형 웹앱 템플릿.

포함된 것: JWT 로그인 · 롤×부서 권한(라우트 가드 + 사이드바 + SecurityConfig) · 계정 관리(ADMIN) ·
사이드바/상단바 레이아웃 · 공용 UI(shadcn·필터·차트·페이지네이션) · Flyway 마이그레이션 · Swagger UI(`/docs/`) · Docker(app + Postgres).

## 환경 구성

| 환경 | compose 파일 | env 파일 | Spring 프로파일 | 외부 포트 | 특징 |
|---|---|---|---|---|---|
| **local** | `docker-compose.local.yml` | `backend/.env.local` | `local` | app :18080, postgres :15432 | DB 포트 노출, 로그 그대로 |
| **dev** | `docker-compose.dev.yml` | `backend/.env.dev` | `dev` | app :80 (postgres 내부) | 팀 공용 EC2, 로그 100MB×10 |
| **prod** | `docker-compose.prod.yml` | `backend/.env.prod` | `prod` | app :80 (postgres 내부) | 운영 EC2, 로그 50MB×5, healthcheck |

세 환경 모두 같은 Dockerfile 로 로컬 빌드, 같은 compose 패턴(app + postgres). 차이는 포트 노출·env 파일·로그 정책뿐.

## 로컬 개발

```bash
# 최초 1회
cp backend/.env.local.example backend/.env.local
openssl rand -base64 48            # → APP_JWT_SECRET 에 붙이기
vi backend/.env.local              # 관리자 비밀번호 등 채움

# ① 전체 스택 (운영 유사 환경)
docker compose -f docker-compose.local.yml --env-file backend/.env.local up -d --build
# → http://localhost:18080  로그인: admin / APP_SEED_ADMIN_PASSWORD

# ② 핫리로드가 필요하면 DB 만 Docker, 앱은 호스트에서 bootRun
docker compose -f docker-compose.local.yml --env-file backend/.env.local up -d postgres
./gradlew :backend:bootRun --args='--spring.profiles.active=local'
cd frontend && npm run dev         # http://localhost:15173
```

중지: `docker compose -f docker-compose.local.yml down` (볼륨까지: `down -v`)

## 개발서버 (dev) · 운영 (prod) 배포 — 단일 EC2

전제: EC2 1대, 외부 AWS 서비스(RDS/ECR/ALB) 없이 compose 로 app + postgres 모두 호스팅.

```bash
# ── EC2 최초 셋업 (dev / prod 공통) ────────────────────────
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER && newgrp docker
git clone <저장소> && cd <저장소명>

# ── dev 서버 ─────────────────────────────────────────────
git checkout develop
cp backend/.env.dev.example backend/.env.dev
chmod 600 backend/.env.dev && vi backend/.env.dev
docker compose -f docker-compose.dev.yml --env-file backend/.env.dev up -d --build

# ── prod 서버 ────────────────────────────────────────────
git checkout main
cp backend/.env.prod.example backend/.env.prod
chmod 600 backend/.env.prod && vi backend/.env.prod
docker compose -f docker-compose.prod.yml --env-file backend/.env.prod up -d --build
```

배포(업데이트) 시: `git pull && docker compose -f docker-compose.<env>.yml --env-file backend/.env.<env> up -d --build`

**첫 배포 시 관리자 계정 생성**: `.env.<env>` 에서 `APP_SEED_ENABLED=true` + `APP_SEED_ADMIN_PASSWORD=<8자+>` → 배포 → 로그인 확인 → `false` 로 되돌리고 재배포 (prod 권장, dev 는 유지해도 무방).

**DB 백업**:
```bash
docker compose -f docker-compose.<env>.yml exec postgres pg_dump -U app app > backup-$(date +%Y%m%d).sql
```

**보안 체크리스트**:
- EC2 보안그룹: `:80` (또는 `:443`) inbound 만. **`:5432` 는 절대 외부 노출 금지** (compose 가 안 뚫지만 EC2 SG 에서도 차단)
- `.env.dev` / `.env.prod` 는 `chmod 600`, 저장소엔 `*.example` 만 커밋
- `APP_JWT_SECRET` 은 환경마다 **새로 생성** (local/dev/prod 공유 금지)
- dev SG 는 사내 대역/VPN 만 허용 (0.0.0.0/0 금지)

**HTTPS 가 필요하면**: compose 에 nginx + certbot 컨테이너 추가, 또는 앞단에 Cloudflare. 템플릿 기본엔 포함 안 함.

새 프로젝트 시작 체크리스트, 코딩 규칙은 [`CLAUDE.md`](CLAUDE.md) 를 본다.
