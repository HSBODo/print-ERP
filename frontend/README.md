# Frontend

React 19 + TypeScript + Vite 8 프론트엔드. 프로젝트 규칙은 루트 [`CLAUDE.md`](../CLAUDE.md) 참고.

## 시작하기 (Node 20+)

```bash
npm install
npm run dev      # http://localhost:15173 — /api · /docs 는 localhost:18080 으로 프록시
```

## 스크립트

```bash
npm run build      # tsc -b && vite build
npm run lint       # ESLint (레이어 경계 포함)
npm run test       # Vitest
npm run format     # Prettier
npm run storybook  # Storybook (http://localhost:6006)
```
