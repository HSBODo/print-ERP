# docs — 문서 인덱스

B&VIIT Analytics 대시보드 문서 모음. 카테고리별 진입점입니다.

## 기획 ([기획/](기획/))

| 문서 | 내용 |
|------|------|
| [기획/dashboard-spec.md](기획/dashboard-spec.md) | **대시보드 종합 기획서** (메뉴·API·구현 현황) — 현행 기준 |
| [기획/prd.html](기획/prd.html) | PRD 통합 문서 (PRD·Features·User Flow·Wireframe 탭, 브라우저로 열기) |
| [기획/report-chart-status.md](기획/report-chart-status.md) | 월간/주간 레포트 28개 도표 현황 + 레거시 검증 |

## 데이터 / 지표 ([db/](db/))

| 문서 | 내용 |
|------|------|
| [db/지표정의.md](db/지표정의.md) | **공식 지표 정의서** (검사·수술·예약 집계 기준 SQL·검증값) |
| [db/중단사유-분류-정의.md](db/중단사유-분류-정의.md) | 중단 사유 7버킷 분류 (`EXAM.CANCEL_CD` 기준) — 매핑 변경 절차·검증 쿼리 |
| [db/지표-마감스냅샷-기획.md](db/지표-마감스냅샷-기획.md) | 주간 승인 + 월 마감 스냅샷 아키텍처 (기획) |
| [db/검사자리스트-컬럼정의.md](db/검사자리스트-컬럼정의.md) | 시력교정 검사자 리스트 컬럼↔DB 매핑 |
| [db/백내장검사리스트-컬럼정의.md](db/백내장검사리스트-컬럼정의.md) | 백내장 검사자 리스트 컬럼↔DB 매핑 |
| [db/검사리스트-ERD-DDL.md](db/검사리스트-ERD-DDL.md) | 검사·백내장 리스트 참조 테이블 ERD/DDL |
| [db/검사자리스트-월별건수.md](db/검사자리스트-월별건수.md) | 검사자 리스트 월별 행수 (레거시 대조) |
| [db/tables/](db/tables/) | **35개 운영 테이블 카탈로그** (컬럼·PK/FK·JOIN·함정) |

## 개발 / 배포

| 문서 | 내용 |
|------|------|
| [screen-first-development.md](screen-first-development.md) | 화면 우선 개발 원칙 + 로컬 3계층 DB 전략 |
| [sqlite-mock-data-guide.md](sqlite-mock-data-guide.md) | 통계 더미 데이터 SQLite 세팅 |
| [responsive-panel-architecture.md](responsive-panel-architecture.md) | 반응형 패널·패널별 독립 API 패턴 (2026-04 핸드오버) |
| [2026-07-15-예약자리스트_홈페이지-추가.md](2026-07-15-예약자리스트_홈페이지-추가.md) | 예약자 리스트_홈페이지 이관 + 온라인 예약 공식 변경 (2026-07 핸드오버) — 실행 설정·실시간 연결·함정 |
| [feature-timeline.md](feature-timeline.md) | 기능 구현 타임라인 (2026-04 계획, 현황은 report-chart-status 참조) |
| [deployment-strategy.md](deployment-strategy.md) | ① 배포 전략·CI |
| [deployment-local.md](deployment-local.md) | ② 로컬 개발 실행 |
| [deployment-release.md](deployment-release.md) | ③ 운영 배포 |

## 보관 ([archive/](archive/))

구현 완료되어 현행 기준 역할이 끝난 설계·초안 문서. 설계 근거 참고용. → [archive/README.md](archive/README.md)
