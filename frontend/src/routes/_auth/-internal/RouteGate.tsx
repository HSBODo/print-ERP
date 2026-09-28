import { Outlet, useLocation, useMatches } from '@tanstack/react-router'
import { canAccess } from '@/config/pageAccess'
import { StatsPlaceholderPage } from '@/pages/StatsPlaceholderPage'
import { useAuthStore } from '@/stores/authStore'

// 운영 빌드(PROD)에서는 pending(미완성) 페이지를 차단한다(직접 URL 접근도 placeholder).
const isProd = !import.meta.env.DEV

/**
 * 통계 페이지 접근 차단 — 현재 라우트의 staticData.page 로 판정해, 차단 대상이면 페이지 대신 placeholder 를 렌더한다.
 * role · 부서 기반 차단이 실시간으로 반영되도록 렌더 시점에 판정한다.
 */
export function RouteGate() {
  const page = useMatches({ select: (matches) => matches.at(-1)?.staticData.page })
  const pathname = useLocation({ select: (location) => location.pathname })
  const user = useAuthStore((s) => s.user)

  if (page && canAccess(page, user, isProd) !== 'ok') return <StatsPlaceholderPage page={page} path={pathname} />
  return <Outlet />
}
