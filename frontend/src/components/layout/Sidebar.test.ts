// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { buildMenu, MENU_TREE, type MenuItem, type PagePath } from '@/config/navigation'
import type { AuthUser } from '@/stores/auth-session'

/**
 * 사이드바 노출 규칙 (docs/auth/permissions.md § 2-2, § 3).
 * Sidebar 컴포넌트 전체 렌더 대신, Sidebar 가 쓰는 buildMenu 를 실제 라우트 staticData 로 검증해 회귀를 잡는다.
 */

type MenuUser = Pick<AuthUser, 'role' | 'department'>
const asMedicalStaff: MenuUser = { role: 'STAFF', department: 'MEDICAL' }
const asMarketingStaff: MenuUser = { role: 'STAFF', department: 'MARKETING' }
const asOverseasMarketingStaff: MenuUser = { role: 'STAFF', department: 'OVERSEAS_MARKETING' }
const asAdmin: MenuUser = { role: 'ADMIN', department: 'ALL' }
const asDirector: MenuUser = { role: 'DIRECTOR', department: 'ALL' }

const router = createRouter({ routeTree })
const getPage = (path: PagePath) => router.routesByPath[path]?.options.staticData?.page
const menuFor = (user: MenuUser | null, isProd = false) => buildMenu(MENU_TREE, getPage, user, isProd)

// 트리에서 특정 id 를 재귀로 찾는다.
const findById = (items: MenuItem[], id: string): MenuItem | undefined => {
  for (const item of items) {
    if (item.id === id) return item
    if (item.children) {
      const child = findById(item.children, id)
      if (child) return child
    }
  }
  return undefined
}

// 트리의 모든 잎 id 를 flat 하게 뽑는다.
const collectLeafIds = (items: MenuItem[]): string[] =>
  items.flatMap((item) => (item.children ? collectLeafIds(item.children) : [item.id]))

const ACCOUNTING_IDS = [
  'accounting-medical', 'accounting-vision', 'accounting-vision-summary',
  'accounting-vision-chart', 'accounting-medical-chart',
]

describe('buildMenu · 사이드바 권한·부서 gate', () => {
  it('ADMIN·DIRECTOR (department=ALL) 는 홈·비앤빛·마케팅 섹션을 모두 본다', () => {
    for (const user of [asAdmin, asDirector]) {
      const menu = menuFor(user)
      expect(findById(menu, 'home')).toBeDefined()
      expect(findById(menu, 'bnviit-section')).toBeDefined()
      expect(findById(menu, 'marketing-section')).toBeDefined()
    }
  })

  it('MEDICAL 부서 STAFF: 홈·비앤빛 유지 · 마케팅 섹션은 자식 모두 필터링돼 통째로 제거', () => {
    // § SMS 5-2 완화(2026-09-03) 이후 sms 도 MARKETING 전용이 됐다 →
    // marketing-section 의 잎이 모두 MARKETING 이라 MEDICAL STAFF 에겐 섹션 통째로 사라진다.
    const menu = menuFor(asMedicalStaff)
    expect(findById(menu, 'home')).toBeDefined()
    expect(findById(menu, 'bnviit-section')).toBeDefined()
    expect(findById(menu, 'marketing-section')).toBeUndefined()
  })

  it('MARKETING 부서 STAFF: 홈 유지 · 마케팅 섹션 유지 · 비앤빛 섹션은 자식 모두 사라져 통째로 제거', () => {
    const menu = menuFor(asMarketingStaff)
    expect(findById(menu, 'home')).toBeDefined()
    expect(findById(menu, 'marketing-section')).toBeDefined()
    expect(findById(menu, 'bnviit-section')).toBeUndefined()
  })

  it('MEDICAL 부서 STAFF: 잎 중 마케팅 전용 페이지들은 사라지고, 메디컬 페이지들은 남는다', () => {
    const leafIds = collectLeafIds(menuFor(asMedicalStaff))

    // 홈은 권한 조건이 없는 링크 → 항상 통과
    expect(leafIds).toContain('home')

    expect(leafIds).not.toContain('channel-profit')
    expect(leafIds).not.toContain('reservation-channel')
    expect(leafIds).not.toContain('accumulated-eyes')

    expect(leafIds).toContain('monthly-report')
    expect(leafIds).toContain('reservation-list')
  })

  it('MARKETING 부서 STAFF: 잎 중 메디컬 전용 페이지들은 사라지고, 마케팅 페이지들은 남는다', () => {
    const leafIds = collectLeafIds(menuFor(asMarketingStaff))

    expect(leafIds).toContain('home')
    expect(leafIds).toContain('channel-profit')

    expect(leafIds).not.toContain('monthly-report')
    expect(leafIds).not.toContain('reservation-list')
    expect(leafIds).not.toContain('exam-list')
  })

  it('OVERSEAS_MARKETING 부서 STAFF: 홈 + 해외마케팅 3종만 유지 · 그 외 섹션 모두 제거', () => {
    const menu = menuFor(asOverseasMarketingStaff)
    const leafIds = collectLeafIds(menu)

    expect(leafIds).toEqual([
      'home',
      'overseas-marketing-receptions',
      'overseas-marketing-statistics',
      'overseas-reservation-stats',
    ])
    expect(findById(menu, 'bnviit-section')).toBeUndefined()
    expect(findById(menu, 'marketing-section')).toBeUndefined()
    expect(findById(menu, 'overseas-marketing-section')).toBeDefined()
  })

  it('MARKETING 부서 STAFF 는 해외마케팅 섹션 접근 불가 (2026-09-17 스코프 분리)', () => {
    const menu = menuFor(asMarketingStaff)
    const leafIds = collectLeafIds(menu)
    expect(leafIds).not.toContain('overseas-marketing-receptions')
    expect(leafIds).not.toContain('overseas-marketing-statistics')
    expect(leafIds).not.toContain('overseas-reservation-stats')
    expect(findById(menu, 'overseas-marketing-section')).toBeUndefined()
  })

  it('임원 gate: MANAGER·STAFF 는 회계 5종 제거, ADMIN·DIRECTOR 는 통과 (2026-09-17)', () => {
    // 백엔드 /api/accounting/** 매처는 hasAnyRole("ADMIN","DIRECTOR") 로 대칭.
    for (const user of [asAdmin, asDirector]) {
      const ids = collectLeafIds(menuFor(user))
      for (const id of ACCOUNTING_IDS) expect(ids).toContain(id)
    }
    for (const role of ['MANAGER', 'STAFF'] as const) {
      const menu = menuFor({ role, department: 'MEDICAL' })
      const ids = collectLeafIds(menu)
      for (const id of ACCOUNTING_IDS) expect(ids).not.toContain(id)
      expect(findById(menu, 'accounting-section')).toBeUndefined()
    }
  })

  it('회계 섹션과 잎은 "임원↑" 배지 대상이다 (executiveOnly · adminOnly 아님)', () => {
    const menu = menuFor(asAdmin)
    const section = findById(menu, 'accounting-section')
    expect(section?.executiveOnly).toBe(true)
    expect(section?.adminOnly).toBeFalsy()
    for (const id of ACCOUNTING_IDS) {
      const leaf = findById(menu, id)
      expect(leaf?.executiveOnly).toBe(true)
      expect(leaf?.adminOnly).toBeFalsy()
    }
  })

  it('관리자 섹션은 ADMIN 에게만 보이고, 하위 잎은 "관리자" 배지(adminReal) 대상이다', () => {
    const adminMenu = menuFor(asAdmin)
    expect(collectLeafIds(findById(adminMenu, 'admin-section')?.children ?? [])).toEqual([
      'batch-management', 'account-management', 'guide', 'api-docs',
    ])
    expect(findById(adminMenu, 'batch-management')?.adminReal).toBe(true)
    expect(findById(adminMenu, 'guide')?.adminReal).toBe(true)
    // 관리자 섹션 밖의 ADMIN 전용 페이지는 "개발중" 배지 (adminReal 아님)
    expect(findById(adminMenu, 'exam-list')?.adminOnly).toBe(true)
    expect(findById(adminMenu, 'exam-list')?.adminReal).toBeFalsy()

    expect(findById(menuFor(asDirector), 'admin-section')).toBeUndefined()
  })

  it('운영(PROD)에서는 pending 페이지가 메뉴에서 빠지고, 개발에서는 남는다', () => {
    const pendingPage = { id: 'wip', label: 'WIP', section: '테스트', status: 'pending' as const, access: { department: 'MEDICAL' as const } }
    const tree = ['/stats/marketing' as const]
    expect(buildMenu(tree, () => pendingPage, asAdmin, true)).toEqual([])
    expect(buildMenu(tree, () => pendingPage, asAdmin, false).map((i) => i.status)).toEqual(['pending'])
  })

  it('user=null (미인증) 시 권한 조건 없는 노드(홈) 만 통과', () => {
    expect(collectLeafIds(menuFor(null))).toEqual(['home'])
  })
})
