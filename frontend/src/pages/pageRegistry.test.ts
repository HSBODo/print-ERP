import { describe, it, expect } from 'vitest'
import { PAGE_COMPONENTS, isRouteBlocked } from './pageRegistry'
import {
  getMenuStatus,
  getMenuStatusIds,
  getPageDepartments,
  hasExplicitMenuStatus,
  isAdminOnlyPage,
  isExecutiveOnlyPage,
  isMarketingOnlyPage,
  isOverseasMarketingPage,
  statsPages,
} from '../config/navigation'
import { matchesDepartment, type UserRole } from '../stores/auth-session'

// ADMIN·DIRECTOR 는 department='ALL' 이라 부서 gate 를 우회하므로 테스트에서 편의상 사용.
const asAdmin = { role: 'ADMIN' as const, department: 'ALL' as const }
const asDirector = { role: 'DIRECTOR' as const, department: 'ALL' as const }
const asStaffMedical = { role: 'STAFF' as const, department: 'MEDICAL' as const }
const asStaffMarketing = { role: 'STAFF' as const, department: 'MARKETING' as const }

const asRoleUser = (role: UserRole) =>
  role === 'ADMIN' || role === 'DIRECTOR'
    ? ({ role, department: 'ALL' as const })
    : ({ role, department: 'MEDICAL' as const })

/**
 * 통계 페이지 라우트 정책 불변식 가드.
 *
 * 정책: "개발(DEV)에는 페이지가 존재하지만 운영(PROD)에서는 숨김/차단".
 * pending 페이지는 WIP 컴포넌트가 도메인 레지스트리에 등록돼 있어도 운영에선 placeholder로 막힌다.
 * 이 테스트는 그 의미가 상태 드리프트(예: 미완성 페이지를 'complete'로 잘못 변경)로 깨지는 것을 막는다.
 */
describe('통계 페이지 라우트 정책 불변식', () => {
  const ids = statsPages.map((p) => p.id)
  const completeIds = ids.filter((id) => getMenuStatus(id) === 'complete')
  const frontendOnlyIds = ids.filter((id) => getMenuStatus(id) === 'frontend-only')
  const backendOnlyIds = ids.filter((id) => getMenuStatus(id) === 'backend-only')
  const pendingIds = ids.filter((id) => getMenuStatus(id) === 'pending')

  it('complete 페이지는 도메인 레지스트리에 컴포넌트가 등록돼 있어야 한다', () => {
    // 'complete'로 표시됐는데 컴포넌트가 없으면 운영에서 빈 placeholder가 노출됨 → 금지.
    const missing = completeIds.filter((id) => !PAGE_COMPONENTS[id])
    expect(missing).toEqual([])
  })

  it('backend-only 페이지는 모든 환경에서 placeholder로 차단된다', () => {
    for (const id of backendOnlyIds) {
      expect(isRouteBlocked(id, true, asAdmin)).toBe(true)
      expect(isRouteBlocked(id, false, asAdmin)).toBe(true)
    }
  })

  it('frontend-only 페이지가 있으면 컴포넌트가 있고 운영에서도 목업 UI를 표시한다', () => {
    for (const id of frontendOnlyIds) {
      expect(PAGE_COMPONENTS[id]).toBeDefined()
      // ADMIN 은 adminOnly 여부와 무관하게 통과.
      expect(isRouteBlocked(id, true, asAdmin)).toBe(false)
      expect(isRouteBlocked(id, false, asAdmin)).toBe(false)
    }
  })

  it('회계 프런트 미리보기는 ADMIN 만 접근한다 (개발 완성 전까지 되돌림)', () => {
    for (const id of [
      'accounting-medical',
      'accounting-vision',
      'accounting-vision-summary',
      'accounting-vision-chart',
      'accounting-medical-chart',
    ]) {
      expect(PAGE_COMPONENTS[id]).toBeDefined()
      // 회계는 adminOnly 로 되돌림 · executiveOnly 아님
      expect(isAdminOnlyPage(id)).toBe(true)
      expect(isExecutiveOnlyPage(id)).toBe(false)
      // ADMIN 통과 · DIRECTOR·MANAGER·STAFF 모두 차단
      expect(isRouteBlocked(id, true, asAdmin)).toBe(false)
      expect(isRouteBlocked(id, false, asAdmin)).toBe(false)
      expect(isRouteBlocked(id, true, asDirector)).toBe(true)
      expect(isRouteBlocked(id, false, asStaffMedical)).toBe(true)
    }
  })

  it('pending 페이지는 운영(PROD)에서 차단되고 개발(DEV)에서는 허용된다', () => {
    expect(pendingIds.length).toBeGreaterThan(0)
    for (const id of pendingIds) {
      expect(isRouteBlocked(id, true, asAdmin)).toBe(true) // 운영: 차단(placeholder)
      expect(isRouteBlocked(id, false, asAdmin)).toBe(false) // 개발: WIP 미리보기 허용
    }
  })

  it('완료(live) 페이지는 운영에서도 차단되지 않는다 (ADMIN 롤 기준)', () => {
    // admin-only 페이지도 ADMIN 롤에게는 열려있어야 한다.
    for (const id of completeIds) {
      expect(isRouteBlocked(id, true, asAdmin)).toBe(false)
    }
  })

  it('ADMIN 전용 페이지는 role !== ADMIN 이면 환경 무관하게 차단된다', () => {
    const adminOnlyIds = completeIds.filter((id) => isAdminOnlyPage(id))
    expect(adminOnlyIds.length).toBeGreaterThan(0)
    for (const id of adminOnlyIds) {
      expect(isRouteBlocked(id, false, asRoleUser('STAFF'))).toBe(true)
      expect(isRouteBlocked(id, true, asRoleUser('STAFF'))).toBe(true)
      expect(isRouteBlocked(id, false, undefined)).toBe(true)
      // DIRECTOR 도 시스템 조작 불가 — 관리자 페이지는 차단.
      expect(isRouteBlocked(id, true, asDirector)).toBe(true)
    }
  })

  it('statsPages id는 중복이 없어야 한다', () => {
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('statsPages와 MENU_STATUS id는 서로 누락 없이 맞아야 한다', () => {
    const statusIds = getMenuStatusIds()

    expect(ids.filter((id) => !hasExplicitMenuStatus(id))).toEqual([])
    expect(statusIds.filter((id) => !ids.includes(id))).toEqual([])
  })

  it('부서 gate: MARKETING 전용 페이지는 MEDICAL 부서 STAFF 에게 차단된다', () => {
    const marketingIds = ids.filter((id) => isMarketingOnlyPage(id))
    expect(marketingIds.length).toBeGreaterThan(0)
    for (const id of marketingIds) {
      // 개발 환경 · MEDICAL 부서 STAFF → 차단
      expect(isRouteBlocked(id, false, asStaffMedical)).toBe(true)
    }
  })

  it('부서 gate: MEDICAL 전용 페이지는 MARKETING 부서 STAFF 에게 차단된다', () => {
    // MEDICAL 전용 = 마케팅 전용도 아니고 · 해외마케팅 개방도 아니고 · admin 도 아닌 통계 페이지 (기본값).
    // 해외마케팅 3종은 MARKETING·OVERSEAS_MARKETING 두 부서 개방이라 MARKETING STAFF 도 통과 → 여기서 제외.
    const medicalIds = completeIds.filter(
      (id) => !isMarketingOnlyPage(id) && !isOverseasMarketingPage(id) && !isAdminOnlyPage(id),
    )
    expect(medicalIds.length).toBeGreaterThan(0)
    for (const id of medicalIds) {
      expect(isRouteBlocked(id, false, asStaffMarketing)).toBe(true)
    }
  })

  it('부서 gate: ADMIN·DIRECTOR (department=ALL) 는 부서와 무관하게 통과', () => {
    for (const id of completeIds) {
      // ADMIN 전용 아닌 페이지에 한해 DIRECTOR 도 통과해야 함.
      if (isAdminOnlyPage(id)) continue
      expect(isRouteBlocked(id, false, asAdmin)).toBe(false)
      expect(isRouteBlocked(id, false, asDirector)).toBe(false)
    }
  })

  it('임원 gate: executiveOnly 페이지는 MANAGER·STAFF 에게 차단되고 ADMIN·DIRECTOR 는 통과한다', () => {
    // 현재 executiveOnly 대상 페이지 없음(회계는 ADMIN 전용으로 되돌림). 인프라 자체는 유지되므로
    // 대상이 다시 지정되면 자동으로 이 케이스가 활성화된다.
    const executiveIds = ids.filter((id) => isExecutiveOnlyPage(id))
    const asManagerMedical = { role: 'MANAGER' as const, department: 'MEDICAL' as const }
    for (const id of executiveIds) {
      expect(isRouteBlocked(id, false, asStaffMedical)).toBe(true)
      expect(isRouteBlocked(id, false, asStaffMarketing)).toBe(true)
      expect(isRouteBlocked(id, false, asManagerMedical)).toBe(true)
      expect(isRouteBlocked(id, false, asAdmin)).toBe(false)
      expect(isRouteBlocked(id, false, asDirector)).toBe(false)
    }
  })

  it('페이지 부서 스코프 헬퍼는 statsPages 안 id 는 항상 정의된 배열을 반환한다', () => {
    for (const id of ids) {
      const deps = getPageDepartments(id)
      expect(deps).toBeDefined()
      expect(Array.isArray(deps)).toBe(true)
    }
  })

  it('홈(home) · 통계 페이지 밖 id 는 스코프 없음(undefined) — 모든 부서 통과', () => {
    // 사이드바 pruneByDepartment 가 잎 노드마다 getPageDepartments 를 조회하는데,
    // 홈은 statsPages 에 없으므로 default 'MEDICAL' 로 잘못 판정되면 MARKETING STAFF 에게 홈이 사라진다.
    expect(getPageDepartments('home')).toBeUndefined()
    expect(getPageDepartments('some-unknown-id')).toBeUndefined()

    // matchesDepartment 는 undefined 를 "스코프 없음 → 통과" 로 처리해야 함
    expect(matchesDepartment(asStaffMedical, getPageDepartments('home'))).toBe(true)
    expect(matchesDepartment(asStaffMarketing, getPageDepartments('home'))).toBe(true)
    expect(matchesDepartment(asAdmin, getPageDepartments('home'))).toBe(true)
  })
})
