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

  it('pruneExecutiveOnly: MANAGER·STAFF 에게는 accounting-section 이 통째로 사라진다', () => {
    // 2026-09-11 정책 — 회계 그룹은 임원 이상(ADMIN·DIRECTOR) 만 열람.
    const staffFiltered = pruneExecutiveOnly(menuItems, 'STAFF')
    const managerFiltered = pruneExecutiveOnly(menuItems, 'MANAGER')
    expect(findById(staffFiltered, 'accounting-section')).toBeUndefined()
    expect(findById(managerFiltered, 'accounting-section')).toBeUndefined()

    // 잎도 사라져야 한다 (accounting-medical 등)
    expect(collectLeafIds(staffFiltered)).not.toContain('accounting-medical')
    expect(collectLeafIds(managerFiltered)).not.toContain('accounting-vision-summary')
  })

  it('pruneExecutiveOnly: ADMIN·DIRECTOR 에게는 accounting-section 이 유지된다', () => {
    const adminFiltered = pruneExecutiveOnly(menuItems, 'ADMIN')
    const directorFiltered = pruneExecutiveOnly(menuItems, 'DIRECTOR')
    expect(findById(adminFiltered, 'accounting-section')).toBeDefined()
    expect(findById(directorFiltered, 'accounting-section')).toBeDefined()
    expect(collectLeafIds(directorFiltered)).toContain('accounting-medical')
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
