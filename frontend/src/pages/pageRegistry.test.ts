import { describe, it, expect } from 'vitest'
import { PAGE_COMPONENTS, isRouteBlocked } from './pageRegistry'
import {
  getMenuStatus,
  getMenuStatusIds,
  hasExplicitMenuStatus,
  isAdminOnlyPage,
  statsPages,
} from '../config/navigation'

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
      expect(isRouteBlocked(id, true, 'ADMIN')).toBe(true)
      expect(isRouteBlocked(id, false, 'ADMIN')).toBe(true)
    }
  })

  it('frontend-only 페이지가 있으면 컴포넌트가 있고 운영에서도 목업 UI를 표시한다', () => {
    for (const id of frontendOnlyIds) {
      expect(PAGE_COMPONENTS[id]).toBeDefined()
      expect(isRouteBlocked(id, true, 'ADMIN')).toBe(false)
      expect(isRouteBlocked(id, false, 'ADMIN')).toBe(false)
    }
  })

  it('pending 페이지는 운영(PROD)에서 차단되고 개발(DEV)에서는 허용된다', () => {
    expect(pendingIds.length).toBeGreaterThan(0)
    for (const id of pendingIds) {
      expect(isRouteBlocked(id, true, 'ADMIN')).toBe(true) // 운영: 차단(placeholder)
      expect(isRouteBlocked(id, false, 'ADMIN')).toBe(false) // 개발: WIP 미리보기 허용
    }
  })

  it('완료(live) 페이지는 운영에서도 차단되지 않는다 (ADMIN 롤 기준)', () => {
    // admin-only 페이지도 ADMIN 롤에게는 열려있어야 한다.
    for (const id of completeIds) {
      expect(isRouteBlocked(id, true, 'ADMIN')).toBe(false)
    }
  })

  it('ADMIN 전용 페이지는 role !== ADMIN 이면 환경 무관하게 차단된다', () => {
    const adminOnlyIds = completeIds.filter((id) => isAdminOnlyPage(id))
    expect(adminOnlyIds.length).toBeGreaterThan(0)
    for (const id of adminOnlyIds) {
      expect(isRouteBlocked(id, false, 'USER')).toBe(true)
      expect(isRouteBlocked(id, true, 'USER')).toBe(true)
      expect(isRouteBlocked(id, false, undefined)).toBe(true)
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
})
