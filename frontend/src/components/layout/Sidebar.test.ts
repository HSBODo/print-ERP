import { describe, it, expect } from 'vitest'
import { menuItems, pruneByDepartment, pruneExecutiveOnly, type MenuItem } from '@/config/navigation'
import type { AuthUser } from '@/stores/auth-session'

/**
 * pruneByDepartment 는 사이드바 부서 gate 의 핵심 로직 (docs/auth/permissions.md § 2-2, § 3).
 * Sidebar 컴포넌트 전체 렌더 대신 이 순수 함수만 검증해 회귀를 잡는다.
 */

const asMedicalStaff: Pick<AuthUser, 'department'> = { department: 'MEDICAL' }
const asMarketingStaff: Pick<AuthUser, 'department'> = { department: 'MARKETING' }
const asOverseasMarketingStaff: Pick<AuthUser, 'department'> = { department: 'OVERSEAS_MARKETING' }
const asAdminOrDirector: Pick<AuthUser, 'department'> = { department: 'ALL' }

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

describe('pruneByDepartment · 사이드바 부서 gate', () => {
  it('ADMIN·DIRECTOR (department=ALL) 는 원본 트리를 그대로 통과시킨다', () => {
    const filtered = pruneByDepartment(menuItems, asAdminOrDirector)
    // 홈 · 비앤빛 섹션 · 마케팅 섹션 모두 존재
    expect(findById(filtered, 'home')).toBeDefined()
    expect(findById(filtered, 'bnviit-section')).toBeDefined()
    expect(findById(filtered, 'marketing-section')).toBeDefined()
  })

  it('MEDICAL 부서 STAFF: 홈·비앤빛 유지 · 마케팅 섹션은 자식 모두 필터링돼 통째로 제거', () => {
    // § SMS 5-2 완화(2026-09-03) 이후 sms 도 MARKETING 전용이 됐다 →
    // marketing-section 의 잎이 모두 MARKETING 이라 MEDICAL STAFF 에겐 섹션 통째로 사라진다
    // (문서 § 2-2 대칭 원칙 완성).
    const filtered = pruneByDepartment(menuItems, asMedicalStaff)
    expect(findById(filtered, 'home')).toBeDefined()
    expect(findById(filtered, 'bnviit-section')).toBeDefined()
    expect(findById(filtered, 'marketing-section')).toBeUndefined()
  })

  it('MARKETING 부서 STAFF: 홈 유지 · 마케팅 섹션 유지 · 비앤빛 섹션은 자식 모두 사라져 통째로 제거', () => {
    const filtered = pruneByDepartment(menuItems, asMarketingStaff)
    expect(findById(filtered, 'home')).toBeDefined()
    expect(findById(filtered, 'marketing-section')).toBeDefined()

    // 비앤빛 섹션 안 페이지들이 모두 MEDICAL 전용이라 통째로 사라져야 한다.
    expect(findById(filtered, 'bnviit-section')).toBeUndefined()
  })

  it('MEDICAL 부서 STAFF: 잎 중 마케팅 전용 페이지들은 사라지고, 메디컬 페이지들은 남는다', () => {
    const filtered = pruneByDepartment(menuItems, asMedicalStaff)
    const leafIds = collectLeafIds(filtered)

    // 홈은 statsPages 밖이라 undefined 스코프 → 항상 통과
    expect(leafIds).toContain('home')

    // MARKETING 전용 페이지들은 사라져야 함
    expect(leafIds).not.toContain('channel-profit')
    expect(leafIds).not.toContain('reservation-channel')
    expect(leafIds).not.toContain('accumulated-eyes')

    // 메디컬 페이지 몇 개는 남아 있어야 함
    expect(leafIds).toContain('monthly-report')
    expect(leafIds).toContain('reservation-list')
  })

  it('MARKETING 부서 STAFF: 잎 중 메디컬 전용 페이지들은 사라지고, 마케팅 페이지들은 남는다', () => {
    const filtered = pruneByDepartment(menuItems, asMarketingStaff)
    const leafIds = collectLeafIds(filtered)

    expect(leafIds).toContain('home')
    expect(leafIds).toContain('channel-profit')

    // 메디컬 전용 페이지들은 사라져야 함
    expect(leafIds).not.toContain('monthly-report')
    expect(leafIds).not.toContain('reservation-list')
    expect(leafIds).not.toContain('exam-list')
  })

  it('OVERSEAS_MARKETING 부서 STAFF: 홈 + 해외마케팅 3종만 유지 · 그 외 섹션 모두 제거', () => {
    // 2026-09-11 신설 좁은 스코프 — MARKETING 도 아니고 MEDICAL 도 아님. 홈과 해외마케팅 섹션만.
    const filtered = pruneByDepartment(menuItems, asOverseasMarketingStaff)
    const leafIds = collectLeafIds(filtered)

    expect(leafIds).toContain('home')
    expect(leafIds).toContain('overseas-marketing-receptions')
    expect(leafIds).toContain('overseas-marketing-statistics')
    expect(leafIds).toContain('overseas-reservation-stats')

    // 다른 마케팅 파생 페이지·메디컬 페이지는 사라져야 한다
    expect(leafIds).not.toContain('channel-profit')
    expect(leafIds).not.toContain('sms')
    expect(leafIds).not.toContain('reservation-channel')
    expect(leafIds).not.toContain('monthly-report')
    expect(leafIds).not.toContain('reservation-list')

    // 비앤빛·마케팅 섹션은 통째로 사라지고, 해외마케팅 섹션만 남는다.
    expect(findById(filtered, 'bnviit-section')).toBeUndefined()
    expect(findById(filtered, 'marketing-section')).toBeUndefined()
    expect(findById(filtered, 'overseas-marketing-section')).toBeDefined()
  })

  it('MARKETING 부서 STAFF 도 해외마케팅 섹션에 여전히 접근 가능 (상위 스코프)', () => {
    // OVERSEAS_MARKETING 부서 신설로 해외마케팅 3종이 두 부서 개방으로 확장됐지만
    // MARKETING 접근이 축소되면 안 된다 (회귀 방지).
    const filtered = pruneByDepartment(menuItems, asMarketingStaff)
    const leafIds = collectLeafIds(filtered)
    expect(leafIds).toContain('overseas-marketing-receptions')
    expect(leafIds).toContain('overseas-marketing-statistics')
    expect(leafIds).toContain('overseas-reservation-stats')
  })

  it('pruneExecutiveOnly: MANAGER·STAFF 는 회계 5종 제거, ADMIN·DIRECTOR 는 통과 (2026-09-17)', () => {
    // 회계 5종이 EXECUTIVE_ONLY_PAGE_IDS 로 이동. 백엔드 /api/accounting/** 매처는 hasAnyRole("ADMIN","DIRECTOR") 로 대칭.
    const accountingIds = [
      'accounting-medical', 'accounting-vision', 'accounting-vision-summary',
      'accounting-vision-chart', 'accounting-medical-chart',
    ]
    for (const role of ['ADMIN', 'DIRECTOR'] as const) {
      const filtered = pruneExecutiveOnly(menuItems, role)
      const ids = collectLeafIds(filtered)
      for (const id of accountingIds) expect(ids).toContain(id)
    }
    for (const role of ['MANAGER', 'STAFF'] as const) {
      const filtered = pruneExecutiveOnly(menuItems, role)
      const ids = collectLeafIds(filtered)
      for (const id of accountingIds) expect(ids).not.toContain(id)
    }
  })

  it('accounting-section 은 executiveOnly 로 마킹돼 있어 임원 게이트가 담당한다 (2026-09-17)', () => {
    // Sidebar 내부의 pruneExecutiveOnly 가 MANAGER·STAFF 에게 accounting-section 을 제거하도록 하는 근거.
    const section = findById(menuItems, 'accounting-section')
    expect(section).toBeDefined()
    expect(section?.executiveOnly).toBe(true)
    expect(section?.adminOnly).toBeFalsy()

    // 회계 잎들도 EXECUTIVE_ONLY_PAGE_IDS 를 통해 executiveOnly=true 로 마킹된다.
    for (const id of [
      'accounting-medical',
      'accounting-vision',
      'accounting-vision-summary',
      'accounting-vision-chart',
      'accounting-medical-chart',
    ]) {
      const leaf = findById(menuItems, id)
      expect(leaf?.executiveOnly).toBe(true)
      expect(leaf?.adminOnly).toBeFalsy()
    }
  })

  it('user=null (미인증) 시 스코프 없는 노드(홈) 만 통과', () => {
    // 인증 흐름상 실제로는 도달 안 하지만 방어적 검증.
    const filtered = pruneByDepartment(menuItems, null)
    const leafIds = collectLeafIds(filtered)
    expect(leafIds).toContain('home')
    // MEDICAL 전용 페이지도, MARKETING 전용 페이지도 모두 사라져야 함
    expect(leafIds).not.toContain('monthly-report')
    expect(leafIds).not.toContain('channel-profit')
  })
})
