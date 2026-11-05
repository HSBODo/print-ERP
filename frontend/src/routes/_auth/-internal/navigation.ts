import type { LucideIcon } from 'lucide-react'
import {
  ClipboardList,
  FileText,
  Home,
  Workflow,
  Wrench,
} from 'lucide-react'

import type { FileRouteTypes } from '@/routeTree.gen'
import type { AuthUser } from '#domain/support/session/session'
import {
  hasAccess,
  type PageAccess,
} from '#domain/support/session/utils/access'

import type { MenuStatus, PageMeta } from './pageAccess'

/** 라우트 트리에 실제로 존재하는 경로 — 메뉴에 없는 경로를 적으면 컴파일 에러. */
export type PagePath = FileRouteTypes['fullPaths']

/** 페이지가 아닌 링크 잎 (홈 · 새 탭으로 여는 정적 문서). */
interface LinkNode {
  id: string
  label: string
  href: string
  icon?: LucideIcon
  /** true 이면 SPA 라우팅이 아니라 새 탭으로 연다 (API 문서 등 TanStack Router 밖의 정적 HTML). */
  external?: boolean
  access?: PageAccess
}

/**
 * 섹션·그룹 — 확장 가능한 컨테이너. 필터 후 자식이 비면 사이드바에서 제거된다.
 *   badge 'admin'     — 관리자 섹션. 하위 잎의 ADMIN 전용 배지도 "개발중" 대신 "관리자" 로 표시
 *   badge 'executive' — 임원 이상 섹션
 */
interface ContainerNode {
  id: string
  label: string
  icon: LucideIcon
  kind: 'section' | 'group'
  badge?: 'admin' | 'executive'
  children: MenuNode[]
}

/** 메뉴 트리 노드 — 페이지 잎은 경로만 적고, 표시명·상태·권한은 그 라우트의 staticData.page 에서 가져온다. */
type MenuNode = PagePath | LinkNode | ContainerNode

/**
 * 사이드바에 렌더되는 노드 (buildMenu 결과).
 *   - kind === 'section': 최상위 섹션(관리자 등)
 *   - kind === 'group'  : 확장 가능한 그룹
 *   - kind 미지정       : 잎(단일 링크)
 */
export interface MenuItem {
  id: string
  label: string
  href: string
  icon?: LucideIcon
  children?: MenuItem[]
  status?: MenuStatus
  /** ADMIN 롤 전용 — "개발중"(또는 관리자 섹션 안이면 "관리자") 배지 */
  adminOnly?: boolean
  /** ADMIN·DIRECTOR (임원 이상) 전용 — "임원↑" 배지 */
  executiveOnly?: boolean
  /** 관리자 섹션 안 항목 — ADMIN 전용 배지를 "개발중" 대신 "관리자" 로 표시 */
  adminReal?: boolean
  external?: boolean
  kind?: 'section' | 'group'
}

/**
 * 사이드바에서 뺀 페이지 — 라우트는 유지되어 직접 URL 접근은 가능하다 (권한·pending 차단은 그대로 적용).
 * 메뉴 트리에도 이 목록에도 없는 페이지 라우트는 테스트가 막는다 (메뉴 추가 누락 방지).
 */
export const HIDDEN_PAGE_PATHS: readonly PagePath[] = [
  // 수주 상세·수정은 사이드바에 노출하지 않는다 (목록에서 진입).
  '/orders/$orderId',
]

/**
 * TanStack Router 의 `routesByPath` 는 index 라우트의 trailing slash 를 벗겨서 저장한다 (`/orders/` → key `/orders`).
 * 반면 `FileRouteTypes['fullPaths']`(= `PagePath`) 에는 trailing slash 가 포함된다.
 * 이 헬퍼로 두 경로 표기 모두에서 staticData.page 를 찾는다.
 */
interface RouteWithStaticData {
  options: { staticData?: { page?: PageMeta } }
}
export const resolvePageMeta = (
  routesByPath: object,
  path: PagePath,
): PageMeta | undefined => {
  const lookup = routesByPath as Record<string, RouteWithStaticData | undefined>
  const direct = lookup[path]?.options.staticData?.page
  if (direct) return direct
  if (path.length > 1 && path.endsWith('/')) {
    return lookup[path.slice(0, -1)]?.options.staticData?.page
  }
  return undefined
}

/**
 * 사이드바 3단 구조.
 *   Lv1: HOME(잎) + 섹션
 *   Lv2: 섹션 하위 그룹 또는 직접 잎
 *   Lv3: 그룹 하위 개별 페이지
 *
 * 새 페이지: routes/_auth/ 아래 라우트 파일(staticData.page) 을 만들고 여기 경로를 추가한다.
 * 예)
 *   {
 *     id: 'sales-section', label: '영업', icon: Briefcase, kind: 'section',
 *     children: [
 *       { id: 'orders-group', label: '주문', icon: ShoppingCart, kind: 'group',
 *         children: ['/orders/list', '/orders/stats'] },
 *     ],
 *   },
 */
export const MENU_TREE: MenuNode[] = [
  { id: 'home', label: 'HOME', href: '/', icon: Home },
  {
    id: 'orders-section',
    label: '수주 관리',
    icon: ClipboardList,
    kind: 'section',
    children: ['/orders/', '/orders/new'],
  },
  {
    id: 'workorders-section',
    label: '공정 작업',
    icon: Workflow,
    kind: 'section',
    children: ['/workorders/'],
  },
  {
    id: 'admin-section',
    label: '관리자',
    icon: Wrench,
    kind: 'section',
    badge: 'admin',
    children: [
      '/admin/accounts',
      // Swagger UI — backend static /docs/index.html. Vite dev 는 vite.config.ts 의 /docs 프록시 경유.
      {
        id: 'api-docs',
        label: 'API 문서',
        href: '/docs/',
        icon: FileText,
        external: true,
        access: { role: 'ADMIN' },
      },
    ],
  },
]

type MenuUser = Pick<AuthUser, 'role' | 'department'> | null | undefined

const roleFlags = (access: PageAccess | undefined) => ({
  adminOnly:
    access !== undefined && 'role' in access && access.role === 'ADMIN'
      ? true
      : undefined,
  executiveOnly:
    access !== undefined && 'role' in access && access.role === 'EXECUTIVE'
      ? true
      : undefined,
})

/**
 * 메뉴 트리를 사용자·환경에 맞게 풀어낸다.
 *   - 페이지 잎: getPage(경로) 의 staticData.page 로 표시명·상태·권한을 채운다.
 *     권한이 없으면 제거, 운영(PROD)에서는 pending 도 제거 (개발에서는 빨강으로 표시).
 *   - 링크 잎: access 가 있으면 권한 판정.
 *   - 섹션·그룹: 필터 후 자식이 비면 제거 (예: TEAM_B 사용자에게 TEAM_A 전용 섹션 자체가 안 보인다).
 * 라우트 차단(RouteGate)과 같은 canAccess 규칙을 쓴다.
 */
export const buildMenu = (
  nodes: MenuNode[],
  getPage: (path: PagePath) => PageMeta | undefined,
  user: MenuUser,
  isProd: boolean,
  inAdminSection = false,
): MenuItem[] =>
  nodes.flatMap((node): MenuItem[] => {
    const adminReal = inAdminSection || undefined

    if (typeof node === 'string') {
      const page = getPage(node)
      if (!page || !hasAccess(page.access, user)) return []
      if (isProd && page.status === 'pending') return []
      return [
        {
          id: page.id,
          label: page.label,
          href: node,
          status: page.status,
          ...roleFlags(page.access),
          adminReal,
        },
      ]
    }

    if ('children' in node) {
      const isAdminSection = inAdminSection || node.badge === 'admin'
      const children = buildMenu(
        node.children,
        getPage,
        user,
        isProd,
        isAdminSection,
      )
      if (children.length === 0) return []
      return [
        {
          id: node.id,
          label: node.label,
          href: '#',
          icon: node.icon,
          kind: node.kind,
          adminOnly: node.badge === 'admin' || undefined,
          executiveOnly: node.badge === 'executive' || undefined,
          adminReal: isAdminSection || undefined,
          children,
        },
      ]
    }

    if (node.access && !hasAccess(node.access, user)) return []
    const { access, ...link } = node
    return [{ ...link, ...roleFlags(access), adminReal }]
  })
