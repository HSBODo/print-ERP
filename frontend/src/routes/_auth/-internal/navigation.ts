import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Building2,
  CalendarCheck,
  FileText,
  Globe2,
  Home,
  Hospital,
  Landmark,
  Megaphone,
  MessageSquare,
  Microscope,
  MoreHorizontal,
  Stethoscope,
  Syringe,
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
  /** true 이면 SPA 라우팅이 아니라 새 탭으로 연다 (가이드 등 TanStack Router 밖의 정적 HTML). */
  external?: boolean
  access?: PageAccess
}

/**
 * 섹션·그룹 — 확장 가능한 컨테이너. 필터 후 자식이 비면 사이드바에서 제거된다.
 *   badge 'admin'     — 관리자 섹션. 하위 잎의 ADMIN 전용 배지도 "개발중" 대신 "관리자" 로 표시
 *   badge 'executive' — 임원 이상 섹션 (회계)
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
 *   - kind === 'section': 최상위 섹션(비앤빛·마케팅·해외마케팅·회계·관리자)
 *   - kind === 'group'  : 확장 가능한 그룹(Report·예약·검사 등)
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
 *   - 예약 건수: 예약자 리스트 → 예약 종합만 노출
 *   - 마케팅 효율·취소&부도·객단가: 미완성(pending)
 *   - B2B 매출: 기타 그룹은 드림렌즈 장부만 노출
 */
export const HIDDEN_PAGE_PATHS: readonly PagePath[] = [
  '/stats/reservation',
  '/stats/marketing',
  '/stats/cancel-rate',
  '/stats/no-show-rate',
  '/stats/unit-price',
  '/stats/b2b-revenue',
]

/**
 * 사이드바 3단 구조.
 *   Lv1: HOME(잎) + 섹션 5종(비앤빛·마케팅·해외마케팅·회계·관리자)
 *   Lv2: 섹션 하위 그룹(Report·예약·검사 …) 또는 직접 잎
 *   Lv3: 그룹 하위 개별 페이지
 */
export const MENU_TREE: MenuNode[] = [
  { id: 'home', label: 'HOME', href: '/', icon: Home },
  {
    id: 'bnviit-section',
    label: '비앤빛',
    icon: Building2,
    kind: 'section',
    children: [
      {
        id: 'report-group',
        label: 'Report',
        icon: FileText,
        kind: 'group',
        children: ['/report/monthly', '/report/weekly'],
      },
      {
        id: 'reservation-group',
        label: '예약',
        icon: CalendarCheck,
        kind: 'group',
        // 예약자 리스트 → 예약자 리스트_홈페이지 → 예약 종합 → 예약통계_시력교정 → 예약통계_백내장 → 예약 변경이력 순.
        children: [
          '/stats/reservation-list',
          '/stats/reservation-list-homepage',
          '/stats/reservation-overall',
          '/stats/reservation-stats-system',
          '/stats/reservation-stats-cataract',
          '/stats/reservation-change',
        ],
      },
      {
        id: 'exam-group',
        label: '검사',
        icon: Microscope,
        kind: 'group',
        children: [
          '/stats/overall-exam',
          '/stats/overall-exam-weekly',
          '/stats/exam-list',
          '/stats/cataract-exam-list',
          '/stats/all-exam-list',
          '/stats/eoeis-checkup',
          '/stats/examination',
          '/stats/procedure-exam',
        ],
      },
      {
        id: 'consultation',
        label: '전환&성공률',
        icon: Stethoscope,
        kind: 'group',
        children: [
          '/stats/consultation-rate',
          '/stats/cataract-reservation-rate',
          '/stats/stop-rate',
          '/stats/stop-reason',
        ],
      },
      {
        id: 'surgery-group',
        label: '수술',
        icon: Syringe,
        kind: 'group',
        children: [
          '/stats/surgery-list',
          '/stats/surgery',
          '/stats/surgery-ratio',
          '/stats/surgery-composition',
        ],
      },
      {
        id: 'outpatient',
        label: '외래',
        icon: Hospital,
        kind: 'group',
        children: ['/stats/outpatient-list', '/stats/outpatient-count'],
      },
      {
        id: 'etc',
        label: '기타',
        icon: MoreHorizontal,
        kind: 'group',
        children: ['/stats/dreamlens-revenue'],
      },
    ],
  },
  {
    id: 'marketing-section',
    label: '마케팅',
    icon: Megaphone,
    kind: 'section',
    // 예약 퍼널은 유입 채널 효율을 보는 화면이라 예약보다 마케팅에 가깝다(2026-08-06 이동).
    // 채널별 수익성은 그 짝이다 — 퍼널이 '얼마나 오나'(전환 축), 이쪽이 '얼마 버나'(가치 축).
    // 해외마케팅(접수리스트·통계·예약통계)은 아래 별도 최상위 섹션(overseas-marketing-section)이다.
    children: [
      '/stats/reservation-channel',
      '/stats/channel-profit',
      '/stats/channel-analysis',
      '/stats/accumulated-eyes',
      // 문자 발송 관리는 향후 하위 페이지(이력·템플릿 등) 확장을 대비해 그룹으로 감쌈.
      // 편집·[지금 실행]·[실패 재실행] 만 ADMIN (페이지 안 canSystemOp + 백엔드 hasRole('ADMIN')).
      {
        id: 'sms-management',
        label: '문자 발송 관리',
        icon: MessageSquare,
        kind: 'group',
        children: ['/stats/sms'],
      },
    ],
  },
  {
    id: 'overseas-marketing-section',
    label: '해외마케팅',
    icon: Globe2,
    kind: 'section',
    // 접수리스트 → 통계 → 예약통계 순. OVERSEAS_MARKETING 부서 전용 (2026-09-17 MARKETING 배제).
    children: [
      '/stats/overseas-marketing/receptions',
      '/stats/overseas-marketing/statistics',
      '/stats/overseas-marketing/reservation-stats',
    ],
  },
  {
    id: 'accounting-section',
    label: '회계',
    icon: Landmark,
    kind: 'section',
    // 임원(DIRECTOR) 이상 개방(2026-09-17). 백엔드 /api/accounting/** 매처가 hasAnyRole("ADMIN","DIRECTOR") 로 대칭.
    badge: 'executive',
    children: [
      '/accounting/medical-receipts',
      '/accounting/vision-revenue',
      '/accounting/vision-revenue-summary',
      '/accounting/vision-revenue-chart',
      '/accounting/medical-revenue-chart',
    ],
  },
  {
    id: 'admin-section',
    label: '관리자',
    icon: Wrench,
    kind: 'section',
    badge: 'admin',
    children: [
      '/admin/batch',
      '/admin/accounts',
      // 정적 기획서(frontend/public/guide) — 새 탭에서 열린다.
      {
        id: 'guide',
        label: '가이드',
        href: '/guide/prd.html',
        icon: BookOpen,
        external: true,
        access: { role: 'ADMIN' },
      },
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
 *   - 섹션·그룹: 필터 후 자식이 비면 제거 (예: MARKETING 사용자에게 비앤빛 섹션 자체가 안 보인다).
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
