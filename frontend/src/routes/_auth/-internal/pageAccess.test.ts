// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import type { UserRole } from '#domain/support/session/session'

import { testRoutes } from '../../../test/testRoutes'
import { canAccess, type PageMeta } from './pageAccess'

// ADMIN·DIRECTOR 는 department='ALL' 이라 부서 gate 를 우회하므로 테스트에서 편의상 사용.
const asAdmin = { role: 'ADMIN' as const, department: 'ALL' as const }
const asDirector = { role: 'DIRECTOR' as const, department: 'ALL' as const }
const asStaffMedical = {
  role: 'STAFF' as const,
  department: 'MEDICAL' as const,
}
const asStaffMarketing = {
  role: 'STAFF' as const,
  department: 'MARKETING' as const,
}
const asManagerMedical = {
  role: 'MANAGER' as const,
  department: 'MEDICAL' as const,
}

const asRoleUser = (role: UserRole) =>
  role === 'ADMIN' || role === 'DIRECTOR'
    ? { role, department: 'ALL' as const }
    : { role, department: 'MEDICAL' as const }

const pages: PageMeta[] = testRoutes.flatMap((route) =>
  route.options.staticData?.page ? [route.options.staticData.page] : [],
)
const byStatus = (status: PageMeta['status']) =>
  pages.filter((p) => p.status === status)
const isRole = (p: PageMeta, role: 'ADMIN' | 'EXECUTIVE') =>
  'role' in p.access && p.access.role === role
const isDepartment = (p: PageMeta, department: string) =>
  'department' in p.access && p.access.department === department

const blocked = (
  p: PageMeta,
  isProd: boolean,
  user: Parameters<typeof canAccess>[1],
) => canAccess(p, user, isProd) !== 'ok'

/**
 * 통계 페이지 접근 정책 불변식 가드 (라우트 staticData.page 기준).
 *
 * 정책: "개발(DEV)에는 페이지가 존재하지만 운영(PROD)에서는 숨김/차단".
 * pending 페이지는 WIP 컴포넌트가 라우트로 등록돼 있어도 운영에선 placeholder로 막힌다.
 * 이 테스트는 그 의미가 상태 드리프트(예: 미완성 페이지를 'complete'로 잘못 변경)로 깨지는 것을 막는다.
 */
describe('통계 페이지 접근 정책 불변식', () => {
  const completeIds = byStatus('complete')

  it('라우트 staticData 로 선언된 통계 페이지가 있다', () => {
    expect(pages.length).toBeGreaterThan(0)
  })

  it('페이지 id 는 중복이 없어야 한다', () => {
    const ids = pages.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('backend-only 페이지는 모든 환경에서 placeholder로 차단된다', () => {
    for (const p of byStatus('backend-only')) {
      expect(canAccess(p, asAdmin, true)).toBe('unavailable')
      expect(canAccess(p, asAdmin, false)).toBe('unavailable')
    }
  })

  it('frontend-only 페이지는 운영에서도 목업 UI를 표시한다', () => {
    for (const p of byStatus('frontend-only')) {
      // ADMIN 은 role 조건과 무관하게 통과.
      expect(blocked(p, true, asAdmin)).toBe(false)
      expect(blocked(p, false, asAdmin)).toBe(false)
    }
  })

  it('회계 페이지는 임원(ADMIN·DIRECTOR) 이상 접근한다 (백엔드 /api/accounting/** 매처와 대칭, 2026-09-17)', () => {
    const accounting = pages.filter((p) => p.id.startsWith('accounting-'))
    expect(
      accounting.map((p) => p.id).sort((a, b) => a.localeCompare(b, 'ko')),
    ).toEqual([
      'accounting-medical',
      'accounting-medical-chart',
      'accounting-vision',
      'accounting-vision-chart',
      'accounting-vision-summary',
    ])
    for (const p of accounting) {
      expect(isRole(p, 'EXECUTIVE')).toBe(true)
      // ADMIN·DIRECTOR 통과 · MANAGER·STAFF 차단
      expect(blocked(p, true, asAdmin)).toBe(false)
      expect(blocked(p, false, asAdmin)).toBe(false)
      expect(blocked(p, true, asDirector)).toBe(false)
      expect(blocked(p, false, asDirector)).toBe(false)
      expect(canAccess(p, asStaffMedical, false)).toBe('forbidden')
      expect(canAccess(p, asStaffMarketing, false)).toBe('forbidden')
    }
  })

  it('pending 페이지는 운영(PROD)에서 차단되고 개발(DEV)에서는 허용된다', () => {
    const pendingIds = byStatus('pending')
    expect(pendingIds.length).toBeGreaterThan(0)
    for (const p of pendingIds) {
      expect(canAccess(p, asAdmin, true)).toBe('unavailable') // 운영: 차단(placeholder)
      expect(blocked(p, false, asAdmin)).toBe(false) // 개발: WIP 미리보기 허용
    }
  })

  it('완료(live) 페이지는 운영에서도 차단되지 않는다 (ADMIN 롤 기준)', () => {
    // admin-only 페이지도 ADMIN 롤에게는 열려있어야 한다.
    for (const p of completeIds) {
      expect(blocked(p, true, asAdmin)).toBe(false)
    }
  })

  it('ADMIN 전용 페이지는 role !== ADMIN 이면 환경 무관하게 차단된다', () => {
    const adminOnly = completeIds.filter((p) => isRole(p, 'ADMIN'))
    expect(adminOnly.length).toBeGreaterThan(0)
    for (const p of adminOnly) {
      expect(canAccess(p, asRoleUser('STAFF'), false)).toBe('forbidden')
      expect(canAccess(p, asRoleUser('STAFF'), true)).toBe('forbidden')
      expect(canAccess(p, undefined, false)).toBe('forbidden')
      // DIRECTOR 도 시스템 조작 불가 — 관리자 페이지는 차단.
      expect(canAccess(p, asDirector, true)).toBe('forbidden')
    }
  })

  it('부서 gate: MARKETING 전용 페이지는 MEDICAL 부서 STAFF 에게 차단된다', () => {
    const marketing = pages.filter((p) => isDepartment(p, 'MARKETING'))
    expect(marketing.length).toBeGreaterThan(0)
    for (const p of marketing) {
      expect(canAccess(p, asStaffMedical, false)).toBe('forbidden')
    }
  })

  it('부서 gate: MEDICAL 전용 페이지는 MARKETING 부서 STAFF 에게 차단된다', () => {
    const medical = completeIds.filter((p) => isDepartment(p, 'MEDICAL'))
    expect(medical.length).toBeGreaterThan(0)
    for (const p of medical) {
      expect(canAccess(p, asStaffMarketing, false)).toBe('forbidden')
    }
  })

  it('부서 gate: 해외마케팅 3종은 MARKETING 부서 STAFF 에게 차단된다 (2026-09-17 스코프 분리)', () => {
    // 2026-09-17: MARKETING 을 해외마케팅에서 배제. OVERSEAS_MARKETING 전담 부서만 접근.
    const overseas = completeIds.filter((p) =>
      isDepartment(p, 'OVERSEAS_MARKETING'),
    )
    expect(overseas.length).toBe(3)
    for (const p of overseas) {
      expect(canAccess(p, asStaffMarketing, false)).toBe('forbidden')
    }
  })

  it('부서 gate: ADMIN·DIRECTOR (department=ALL) 는 부서와 무관하게 통과', () => {
    for (const p of completeIds) {
      // ADMIN 전용 아닌 페이지에 한해 DIRECTOR 도 통과해야 함.
      if (isRole(p, 'ADMIN')) continue
      expect(blocked(p, false, asAdmin)).toBe(false)
      expect(blocked(p, false, asDirector)).toBe(false)
    }
  })

  it('임원 gate: EXECUTIVE 페이지는 MANAGER·STAFF 에게 차단되고 ADMIN·DIRECTOR 는 통과한다 (2026-09-17 회계 5종 대상)', () => {
    // 2026-09-17: 회계 5종이 여기로 이동. MANAGER 는 STAFF 와 동일 취급.
    const executive = pages.filter((p) => isRole(p, 'EXECUTIVE'))
    expect(executive.length).toBeGreaterThan(0)
    for (const p of executive) {
      expect(canAccess(p, asStaffMedical, false)).toBe('forbidden')
      expect(canAccess(p, asStaffMarketing, false)).toBe('forbidden')
      expect(canAccess(p, asManagerMedical, false)).toBe('forbidden')
      expect(blocked(p, false, asAdmin)).toBe(false)
      expect(blocked(p, false, asDirector)).toBe(false)
    }
  })

  it('미인증(user 없음)은 부서 페이지도 차단된다', () => {
    const medical = completeIds.find((p) => isDepartment(p, 'MEDICAL'))!
    expect(canAccess(medical, null, false)).toBe('forbidden')
  })
})
