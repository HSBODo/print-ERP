import type { FC } from 'react'
import { getMenuStatus, getPageDepartments, isAdminOnlyPage, isExecutiveOnlyPage } from '../config/navigation'
import { matchesDepartment, type AuthUser } from '../stores/auth-session'
import { reportPageRoutes } from './report/routes'
import { reservationPageRoutes } from './reservation/routes'
import { examPageRoutes } from './exam/routes'
import { consultationPageRoutes } from './consultation/routes'
import { surgeryPageRoutes } from './surgery/routes'
import { outpatientPageRoutes } from './outpatient/routes'
import { marketingPageRoutes } from './marketing/routes'
import { smsPageRoutes } from './sms/routes'
import { cancelNoshowPageRoutes } from './cancel-noshow/routes'
import { unitPricePageRoutes } from './unit-price/routes'
import { etcPageRoutes } from './etc/routes'
import { accountingPageRoutes } from './accounting/routes'
import { adminPageRoutes } from './admin/routes'

// 도메인별 페이지 컴포넌트 레지스트리 — 각 pages/<domain>/routes.ts 가 자기 도메인을 소유.
// 새 페이지 연결 = navigation.ts에 정의 + 해당 도메인 routes.ts에 한 줄 추가 (router.tsx 수정 불필요).
export const PAGE_COMPONENTS: Record<string, FC> = {
  ...reportPageRoutes,
  ...reservationPageRoutes,
  ...examPageRoutes,
  ...consultationPageRoutes,
  ...surgeryPageRoutes,
  ...outpatientPageRoutes,
  ...marketingPageRoutes,
  // smsPageRoutes 를 marketing 뒤에 두어 'sms' 키를 실제 SmsManagementPage 로 오버라이드
  // (marketing 의 mock SmsPage 는 삭제됨).
  ...smsPageRoutes,
  ...cancelNoshowPageRoutes,
  ...unitPricePageRoutes,
  ...etcPageRoutes,
  ...accountingPageRoutes,
  ...adminPageRoutes,
}

/**
 * 운영(PROD)에서 pending(미완성) 페이지는 차단한다 — 전용 컴포넌트가 등록돼 있어도 placeholder로 렌더.
 * frontend-only 페이지는 목업 UI 검토를 위해 운영에서도 전용 컴포넌트를 렌더한다.
 * backend-only 페이지는 프론트 화면 미완성이므로 모든 환경에서 placeholder로 렌더.
 * 개발(DEV)에서는 WIP 페이지를 미리보기로 허용한다.
 * 정책: "개발에는 페이지가 존재하지만 운영에서는 숨김/차단" (Sidebar 숨김 + 이 라우트 차단 이중 가드).
 *
 * ADMIN 전용 페이지는 user.role !== 'ADMIN' 이면 환경 무관하게 차단.
 * 부서 gate: 페이지의 부서 스코프와 user.department 가 어긋나면 차단
 * (ADMIN·DIRECTOR (department='ALL') 는 항상 통과 · docs/auth/permissions.md § 3).
 */
export const isRouteBlocked = (
  pageId: string,
  isProd: boolean,
  user: Pick<AuthUser, 'role' | 'department'> | null | undefined = undefined,
): boolean => {
  const status = getMenuStatus(pageId)
  if (status === 'backend-only') return true
  if (isProd && status === 'pending') return true
  if (isAdminOnlyPage(pageId) && user?.role !== 'ADMIN') return true
  // 임원 이상(ADMIN·DIRECTOR) 전용 페이지 — 그 외 롤은 환경 무관하게 차단.
  if (isExecutiveOnlyPage(pageId) && user?.role !== 'ADMIN' && user?.role !== 'DIRECTOR') return true
  if (!matchesDepartment(user ?? null, getPageDepartments(pageId))) return true
  return false
}
