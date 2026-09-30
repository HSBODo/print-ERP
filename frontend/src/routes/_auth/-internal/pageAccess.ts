import type { AuthUser } from '#domain/support/session/session'
import {
  hasAccess,
  type PageAccess,
} from '#domain/support/session/utils/access'

/**
 * 메뉴별 구현 상태.
 *   complete      — 백엔드 API + 프론트 페이지 모두 연결 완료 (회색 기본)
 *   frontend-only — 프론트 UI만 구현, 목업 데이터로 운영 미리보기 가능 (파랑)
 *   backend-only  — 백엔드 API만 완료, 프론트 페이지는 placeholder (주황)
 *   pending       — 미완성. 개발(DEV)에서만 미리보기, 운영(PROD)에서는 차단 (빨강)
 */
export type MenuStatus =
  'complete' | 'frontend-only' | 'backend-only' | 'pending'

/** 통계 페이지 메타 — 각 라우트 파일의 staticData.page 로 선언한다. */
export interface PageMeta {
  id: string
  /** 메뉴·상단바 표시명 */
  label: string
  /** 상단바 "섹션 > 페이지" 의 섹션명 */
  section: string
  status: MenuStatus
  access: PageAccess
  /** 미완성 페이지 placeholder 에 표시하는 대표 API (표시 전용 — 실제 호출 경로와 1:1 아님) */
  apiDraftPath?: string
}

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    page?: PageMeta
  }
}

/**
 * 페이지 접근 판정 — 라우트 차단과 사이드바 노출이 같은 규칙을 쓴다.
 *   'unavailable' — 미완성이라 열 수 없음 (backend-only 는 항상, pending 은 운영에서만) → placeholder
 *   'forbidden'   — 롤·부서 조건 불충족 → 접근 권한 없음
 */
export type PageAccessResult = 'ok' | 'unavailable' | 'forbidden'

export const canAccess = (
  page: Pick<PageMeta, 'status' | 'access'>,
  user: Pick<AuthUser, 'role' | 'department'> | null | undefined,
  isProd: boolean,
): PageAccessResult => {
  if (page.status === 'backend-only') return 'unavailable'
  if (isProd && page.status === 'pending') return 'unavailable'

  return hasAccess(page.access, user) ? 'ok' : 'forbidden'
}
