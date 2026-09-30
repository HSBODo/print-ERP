import {
  getRouteApi,
  Outlet,
  useLocation,
  useMatches,
} from '@tanstack/react-router'
import { StatsPlaceholderPage } from './StatsPlaceholderPage'
import { Forbidden } from './Forbidden'

const authRoute = getRouteApi('/_auth')

/**
 * _auth beforeLoad 의 접근 판정 결과에 따라 페이지 대신 차단 화면을 렌더한다.
 *   unavailable — 미완성 페이지 placeholder
 *   forbidden   — 접근 권한 없음
 */
export function RouteGate() {
  const pageAccess = authRoute.useRouteContext({
    select: (context) => context.pageAccess,
  })
  const page = useMatches({
    select: (matches) => matches.at(-1)?.staticData.page,
  })
  const pathname = useLocation({ select: (location) => location.pathname })

  if (pageAccess === 'forbidden') return <Forbidden />
  if (pageAccess === 'unavailable' && page)
    return <StatsPlaceholderPage page={page} path={pathname} />
  return <Outlet />
}
