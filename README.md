# App Template

Spring Boot 3.5 (Java 21) + React 19 (Vite 8) 관리자형 웹앱 템플릿.

포함된 것: JWT 로그인 · 롤×부서 권한(라우트 가드 + 사이드바 + SecurityConfig) · 계정 관리(ADMIN) ·
사이드바/상단바 레이아웃 · 공용 UI(shadcn·필터·차트·페이지네이션) · Flyway 마이그레이션 · Swagger UI(`/docs/`) · Docker(app + Postgres).

## 빠른 시작

```bash
cp backend/.env.example backend/.env    # 값 채우기 (JWT 시크릿 32자+, 관리자 시드 비밀번호)
docker compose up -d --build            # http://localhost:18080 → admin / APP_SEED_ADMIN_PASSWORD 로 로그인
```

개발 모드, 새 프로젝트 시작 체크리스트, 코딩 규칙은 [`CLAUDE.md`](CLAUDE.md) 를 본다.
