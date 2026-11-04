// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import { testRoutes } from '../../../test/testRoutes'
import { canAccess, type PageMeta } from './pageAccess'

const asAdmin = { role: 'ADMIN' as const, department: 'ALL' as const }
const asDirector = { role: 'DIRECTOR' as const, department: 'ALL' as const }
const asManagerA = { role: 'MANAGER' as const, department: 'TEAM_A' as const }
const asStaffA = { role: 'STAFF' as const, department: 'TEAM_A' as const }
const asStaffB = { role: 'STAFF' as const, department: 'TEAM_B' as const }

const page = (
  access: PageMeta['access'],
  status: PageMeta['status'] = 'complete',
): Pick<PageMeta, 'status' | 'access'> => ({ status, access })

const routePages: PageMeta[] = testRoutes.flatMap((route) =>
  route.options.staticData?.page ? [route.options.staticData.page] : [],
)

/**
 * 페이지 접근 정책 불변식 (canAccess).
 * 정책: "개발(DEV)에는 페이지가 존재하지만 운영(PROD)에서는 미완성 페이지를 숨김/차단".
 */
describe('페이지 접근 정책', () => {
  it('라우트에 선언된 페이지 id 는 중복이 없어야 한다', () => {
    const ids = routePages.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('backend-only 페이지는 모든 환경에서 placeholder로 차단된다', () => {
    const p = page({ department: 'TEAM_A' }, 'backend-only')
    expect(canAccess(p, asAdmin, true)).toBe('unavailable')
    expect(canAccess(p, asAdmin, false)).toBe('unavailable')
  })

  it('frontend-only 페이지는 운영에서도 목업 UI를 표시한다', () => {
    const p = page({ department: 'TEAM_A' }, 'frontend-only')
    expect(canAccess(p, asAdmin, true)).toBe('ok')
    expect(canAccess(p, asAdmin, false)).toBe('ok')
  })

  it('pending 페이지는 운영(PROD)에서 차단되고 개발(DEV)에서는 허용된다', () => {
    const p = page({ department: 'TEAM_A' }, 'pending')
    expect(canAccess(p, asAdmin, true)).toBe('unavailable')
    expect(canAccess(p, asAdmin, false)).toBe('ok')
  })

  it('ADMIN 전용 페이지는 ADMIN 외에는 환경 무관하게 차단된다', () => {
    const p = page({ role: 'ADMIN' })
    expect(canAccess(p, asAdmin, true)).toBe('ok')
    for (const isProd of [true, false]) {
      expect(canAccess(p, asStaffA, isProd)).toBe('forbidden')
      expect(canAccess(p, asDirector, isProd)).toBe('forbidden')
      expect(canAccess(p, undefined, isProd)).toBe('forbidden')
    }
  })

  it('임원 gate: EXECUTIVE 페이지는 ADMIN·DIRECTOR 만 통과한다', () => {
    const p = page({ role: 'EXECUTIVE' })
    expect(canAccess(p, asAdmin, false)).toBe('ok')
    expect(canAccess(p, asDirector, false)).toBe('ok')
    expect(canAccess(p, asManagerA, false)).toBe('forbidden')
    expect(canAccess(p, asStaffA, false)).toBe('forbidden')
  })

  it('부서 gate: 다른 부서 STAFF 는 차단되고, department=ALL 은 항상 통과한다', () => {
    const teamA = page({ department: 'TEAM_A' })
    expect(canAccess(teamA, asStaffA, false)).toBe('ok')
    expect(canAccess(teamA, asManagerA, false)).toBe('ok')
    expect(canAccess(teamA, asStaffB, false)).toBe('forbidden')
    expect(canAccess(teamA, asAdmin, false)).toBe('ok')
    expect(canAccess(teamA, asDirector, false)).toBe('ok')
  })

  it('미인증(user 없음)은 부서 페이지도 차단된다', () => {
    expect(canAccess(page({ department: 'TEAM_A' }), null, false)).toBe(
      'forbidden',
    )
  })

  it('계정 관리 라우트는 ADMIN 전용으로 선언돼 있다 (백엔드 /api/admin/** 와 대칭)', () => {
    const account = routePages.find((p) => p.id === 'account-management')
    expect(account?.access).toEqual({ role: 'ADMIN' })
  })
})
