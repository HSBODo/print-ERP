import type { FC } from 'react'
import { getMenuStatus } from '../config/navigation'
import { reportPageRoutes } from './report/routes'
import { overallPageRoutes } from './overall/routes'
import { reservationPageRoutes } from './reservation/routes'
import { examPageRoutes } from './exam/routes'
import { consultationPageRoutes } from './consultation/routes'
import { surgeryPageRoutes } from './surgery/routes'
import { outpatientPageRoutes } from './outpatient/routes'
import { marketingPageRoutes } from './marketing/routes'
import { cancelNoshowPageRoutes } from './cancel-noshow/routes'
import { unitPricePageRoutes } from './unit-price/routes'
import { etcPageRoutes } from './etc/routes'
import { adminPageRoutes } from './admin/routes'

// 도메인별 페이지 컴포넌트 레지스트리 — 각 pages/<domain>/routes.ts 가 자기 도메인을 소유.
// 새 페이지 연결 = navigation.ts에 정의 + 해당 도메인 routes.ts에 한 줄 추가 (router.tsx 수정 불필요).
export const PAGE_COMPONENTS: Record<string, FC> = {
  ...reportPageRoutes,
  ...overallPageRoutes,
  ...reservationPageRoutes,
  ...examPageRoutes,
  ...consultationPageRoutes,
  ...surgeryPageRoutes,
  ...outpatientPageRoutes,
  ...marketingPageRoutes,
  ...cancelNoshowPageRoutes,
  ...unitPricePageRoutes,
  ...etcPageRoutes,
  ...adminPageRoutes,
}

/**
 * 운영(PROD)에서 pending(미완성) 페이지는 차단한다 — 전용 컴포넌트가 등록돼 있어도 placeholder로 렌더.
 * backend-only 페이지는 프론트 화면 미완성이므로 모든 환경에서 placeholder로 렌더.
 * 개발(DEV)에서는 WIP 페이지를 미리보기로 허용한다.
 * 정책: "개발에는 페이지가 존재하지만 운영에서는 숨김/차단" (Sidebar 숨김 + 이 라우트 차단 이중 가드).
 */
export const isRouteBlocked = (pageId: string, isProd: boolean): boolean => {
  const status = getMenuStatus(pageId)
  return status === 'backend-only' || (isProd && status === 'pending')
}
